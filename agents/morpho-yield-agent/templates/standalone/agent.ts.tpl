import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  formatUnits,
  type Hex,
  type Chain,
} from 'viem'
import { mainnet, base, arbitrum, optimism, polygon, sepolia } from 'viem/chains'
import fs from 'node:fs'
import path from 'node:path'

// -----------------------------------------------------------------------------
// Config — see https://docs.wallet.human.tech/recipes/morpho-yield-optimizer
// -----------------------------------------------------------------------------

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = Number(process.env.CHAIN_ID ?? {{chainId}})
const API_URL = process.env.MORPHO_API_URL ?? 'https://api.morpho.org/graphql'
const RPC_URL = process.env.RPC_URL
const ASSET = (process.env.AGENT_ASSET ?? process.env.ASSET_ADDRESS) as Hex | undefined
const USDC_ADDRESS = (process.env.USDC_ADDRESS ?? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as Hex // mainnet USDC default
const MAX_DEPOSIT_USD = Number(process.env.AGENT_MAX_DEPOSIT_USD ?? 0)
const MIN_DELTA_BPS = Number(process.env.AGENT_MIN_APY_DELTA_BPS ?? 50)
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? process.env.CHECK_INTERVAL_MS ?? 30 * 60 * 1000)
const LOG_FILE = process.env.LOG_FILE ?? `${AGENT_ID}.log`

// Portfolio sizing — split capital across the top N vaults instead of going
// all-in on the single highest APY. Equal-weight by default. REBAL_DRIFT_BPS
// gates how far an individual leg's allocation can drift (in bps of total
// portfolio value) before the agent rebalances toward the target weight.
const TOP_N = Math.max(1, Number(process.env.AGENT_PORTFOLIO_TOP_N ?? 3))
const REBAL_DRIFT_BPS = Math.max(50, Number(process.env.AGENT_REBAL_DRIFT_BPS ?? 500))

// Idle-fallback floor — when the portfolio is at target and there's still idle
// asset balance, sweep it to Aave V3 to keep the money productive. If
// portfolio legs need a top-up, the fallback is unwound first.
// Both AAVE_POOL_ADDRESS and AAVE_ATOKEN_ADDRESS must be set to enable.
const AAVE_POOL = (process.env.AAVE_POOL_ADDRESS ?? '') as Hex | ''
const AAVE_ATOKEN = (process.env.AAVE_ATOKEN_ADDRESS ?? '') as Hex | ''
const IDLE_FALLBACK_ENABLED = /^0x[0-9a-fA-F]{40}$/.test(AAVE_POOL) && /^0x[0-9a-fA-F]{40}$/.test(AAVE_ATOKEN)
const IDLE_FALLBACK_MIN_USD = Number(process.env.AGENT_IDLE_FALLBACK_MIN_USD ?? 1)

// Reward claiming — periodically pulls claimable rewards from the Morpho
// rewards API and submits Merkle-proof claim() calls to the distributor.
// Scheduled independently from the rebalance loop so claim cadence isn't
// tied to APY-check cadence. Disabled unless REWARDS_API_URL is set.
const REWARDS_API_URL = process.env.REWARDS_API_URL ?? ''
const REWARDS_CLAIM_ENABLED = REWARDS_API_URL.length > 0
const REWARDS_CLAIM_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.AGENT_REWARDS_CLAIM_INTERVAL_MS ?? 24 * 60 * 60 * 1000),
)
const REWARDS_MIN_CLAIM_WEI = BigInt(process.env.AGENT_REWARDS_MIN_CLAIM_WEI ?? '1')

// Optional explicit watched-vault allowlist. If unset, the agent queries the
// Morpho API and considers every vault accepting AGENT_ASSET on this chain.
const WATCHED_VAULTS = (process.env.WATCHED_VAULTS ?? '')
  .split(/[,\s]+/)
  .map((s) => s.trim())
  .filter((s) => /^0x[0-9a-fA-F]{40}$/.test(s)) as Hex[]

// Default ON. Going live requires AGENT_DRY_RUN=0 explicitly — anything else
// (typo'd 'true', '0 ', missing, blank) keeps the agent in dry-run.
const DRY_RUN = process.env.AGENT_DRY_RUN !== '0'

// Watchdog integration — writes a PID file on startup so external supervisors
// (systemd Type=simple + a tailer, or a bash watchdog) can detect liveness.
// Defaults to enabled to match the aex Hetzner deployment pattern. Set
// WRITE_PID_FILE=false to opt out (e.g. local dev where stale .pid files
// during crashes are annoying).
const WRITE_PID_FILE = (process.env.WRITE_PID_FILE ?? 'true').toLowerCase() !== 'false'
const PID_FILE = process.env.PID_FILE ?? path.join(process.cwd(), 'agent.pid')

if (!ASSET || !/^0x[0-9a-fA-F]{40}$/.test(ASSET)) {
  console.error(`${TAG} AGENT_ASSET (or ASSET_ADDRESS) must be a valid ERC-20 address`)
  process.exit(1)
}
if (!Number.isFinite(MAX_DEPOSIT_USD) || MAX_DEPOSIT_USD <= 0) {
  console.error(`${TAG} AGENT_MAX_DEPOSIT_USD must be a positive number`)
  process.exit(1)
}

// -----------------------------------------------------------------------------
// Logging — JSON-line to stdout + optional file. Same shape as the canonical
// recipe so dashboards/log scrapers can parse uniformly.
// -----------------------------------------------------------------------------

type LogLevel = 'info' | 'event' | 'warn' | 'error'

function log(level: LogLevel, message: string, data: Record<string, unknown> = {}): void {
  const entry = { ts: new Date().toISOString(), agent: AGENT_ID, level, message, ...data }
  const line = JSON.stringify(entry)
  console.log(line)
  try { fs.appendFileSync(LOG_FILE, line + '\n') } catch {}
}

function logEvent(message: string, data: Record<string, unknown> = {}): void {
  log('event', message, data)
}

// -----------------------------------------------------------------------------
// Matrix alerting — fire-and-forget; never blocks the agent loop on failure.
// Set MATRIX_HOMESERVER, MATRIX_ACCESS_TOKEN, MATRIX_ALERT_ROOM to enable.
// -----------------------------------------------------------------------------

async function sendMatrixAlert(message: string): Promise<void> {
  const homeserver = process.env.MATRIX_HOMESERVER
  const token = process.env.MATRIX_ACCESS_TOKEN
  const room = process.env.MATRIX_ALERT_ROOM
  if (!homeserver || !token || !room) return
  try {
    const txnId = `${Date.now()}${Math.random().toString(36).slice(2)}`
    const url = `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}/send/m.room.message/${txnId}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'm.text', body: `[${AGENT_ID}] ${message}` }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
  } catch (err) {
    log('warn', 'matrix_alert_failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

function fmtBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

// -----------------------------------------------------------------------------
// Chain selection — viem requires an explicit chain object for some helpers.
// -----------------------------------------------------------------------------

const CHAIN_BY_ID: Record<number, Chain> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  11155111: sepolia,
}
const chain: Chain = CHAIN_BY_ID[CHAIN_ID] ?? mainnet

// -----------------------------------------------------------------------------
// ERC-20 + ERC-4626 (MetaMorpho vault) ABI slice we actually use.
// -----------------------------------------------------------------------------

const abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)',
  'function convertToAssets(uint256 shares) view returns (uint256 assets)',
])

// Aave V3 Pool ABI slice — supply / withdraw the floor allocation.
const aaveAbi = parseAbi([
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
])

// Morpho Universal Rewards Distributor — single function used to claim.
const urdAbi = parseAbi([
  'function claim(address account, address reward, uint256 claimable, bytes32[] proof) returns (uint256 amount)',
])

interface MorphoVault {
  address: Hex
  symbol: string
  name: string
  /** Net APY as a decimal fraction, e.g. 0.0425 for 4.25% */
  state?: { netApy?: number; apy?: number; totalAssetsUsd?: number }
  asset: { address: Hex; symbol?: string; decimals: number; priceUsd?: number }
}

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
})

// -----------------------------------------------------------------------------
// waap-cli helpers
// -----------------------------------------------------------------------------

// waap-cli `--json` emits newline-delimited JSON (e.g. `event:submitted`,
// `event:result`, then a pretty-printed final form). Pick the result line.
function parseWaapJson<T>(stdout: string): T {
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().startsWith('{'))
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { event?: string }
      if (obj.event === 'result') return obj as T
    } catch {}
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]) as T } catch {}
  }
  throw new Error(`Could not parse waap-cli JSON: ${stdout.slice(0, 200)}`)
}

async function whoami(): Promise<Hex> {
  // Allow operators to skip the whoami session check by setting
  // WAAP_AGENT_ADDRESS in env. Useful when the agent is deployed alongside a
  // long-running waap-cli session (credentials in env, no interactive login).
  const override = process.env.WAAP_AGENT_ADDRESS?.trim()
  if (override) return override as Hex

  const { stdout } = await execa('waap-cli', ['whoami', '--json'])
  const parsed = parseWaapJson<{ evmWalletAddress?: string }>(stdout)
  if (!parsed.evmWalletAddress) {
    throw new Error('no EVM wallet address — set WAAP_AGENT_ADDRESS or run `waap-cli signup`')
  }
  return parsed.evmWalletAddress as Hex
}

async function sendTx(to: Hex, data: Hex, label: string): Promise<string> {
  if (DRY_RUN) {
    log('info', 'dry_run_skip', { label, to })
    return '0xdryrun'
  }
  const args = ['send-tx', '--to', to, '--value', '0', '--data', data, '--chain', `evm:${CHAIN_ID}`]
  if (RPC_URL) args.push('--rpc', RPC_URL)
  const { stdout } = await execa('waap-cli', args)
  const match = stdout.match(/0x[a-fA-F0-9]{64}/)
  if (!match) {
    throw new Error(`Could not extract tx hash: ${stdout.slice(0, 200)}`)
  }
  log('info', 'tx_submitted', { label, txHash: match[0] })
  return match[0]
}

// -----------------------------------------------------------------------------
// Morpho API + vault reads
// -----------------------------------------------------------------------------

async function fetchVaults(): Promise<MorphoVault[]> {
  // If WATCHED_VAULTS is set, query each vault by address. Otherwise filter
  // by asset on this chain.
  if (WATCHED_VAULTS.length > 0) {
    const items: MorphoVault[] = []
    for (const vaultAddress of WATCHED_VAULTS) {
      const q = {
        query: `query($address: String!, $chainId: Int!) {
          vaultByAddress(address: $address, chainId: $chainId) {
            address symbol name
            state { netApy apy totalAssetsUsd }
            asset { address symbol decimals priceUsd }
          }
        }`,
        variables: { address: vaultAddress, chainId: CHAIN_ID },
      }
      try {
        const res = await request(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(q),
        })
        const body = (await res.body.json()) as { data?: { vaultByAddress?: MorphoVault | null } }
        if (body.data?.vaultByAddress) items.push(body.data.vaultByAddress)
      } catch (err) {
        log('warn', 'fetch_vault_failed', {
          vault: vaultAddress,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return items
  }

  const q = {
    query: `query($asset: String!, $chainId: Int!) {
      vaults(where: { assetAddress_in: [$asset], chainId_in: [$chainId] }, first: 50) {
        items {
          address symbol name
          state { netApy apy totalAssetsUsd }
          asset { address symbol decimals priceUsd }
        }
      }
    }`,
    variables: { asset: ASSET, chainId: CHAIN_ID },
  }
  const res = await request(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(q),
  })
  const body = (await res.body.json()) as { data?: { vaults?: { items?: MorphoVault[] } } }
  return body.data?.vaults?.items ?? []
}

async function positionInVault(vault: Hex, owner: Hex): Promise<{ shares: bigint; assets: bigint }> {
  const shares = (await publicClient.readContract({
    address: vault,
    abi,
    functionName: 'balanceOf',
    args: [owner],
  })) as bigint
  if (shares === 0n) return { shares: 0n, assets: 0n }
  const assets = (await publicClient.readContract({
    address: vault,
    abi,
    functionName: 'convertToAssets',
    args: [shares],
  })) as bigint
  return { shares, assets }
}

async function assetDecimals(): Promise<number> {
  const d = (await publicClient.readContract({
    address: ASSET!,
    abi,
    functionName: 'decimals',
  })) as number | bigint
  return Number(d)
}

async function assetBalance(owner: Hex): Promise<bigint> {
  return (await publicClient.readContract({
    address: ASSET!,
    abi,
    functionName: 'balanceOf',
    args: [owner],
  })) as bigint
}

async function ensureApproval(spender: Hex, amount: bigint, owner: Hex): Promise<void> {
  const current = (await publicClient.readContract({
    address: ASSET!,
    abi,
    functionName: 'allowance',
    args: [owner, spender],
  })) as bigint
  if (current >= amount) return

  const data = encodeFunctionData({ abi, functionName: 'approve', args: [spender, amount] })
  const txHash = await sendTx(ASSET!, data, `approve(${spender})`)
  logEvent('approve', { spender, amount: amount.toString(), txHash })

  // Wait until the allowance is on-chain before continuing. Cap at 60s.
  if (DRY_RUN) return
  for (let i = 0; i < 30; i++) {
    const a = (await publicClient.readContract({
      address: ASSET!,
      abi,
      functionName: 'allowance',
      args: [owner, spender],
    })) as bigint
    if (a >= amount) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`approval did not land within timeout for spender=${spender}`)
}

function toBaseUnits(usd: number, priceUsd: number, decimals: number): bigint {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return 0n
  const tokens = usd / priceUsd
  const scaled = BigInt(Math.floor(tokens * 10 ** Math.min(decimals, 18)))
  if (decimals > 18) return scaled * 10n ** BigInt(decimals - 18)
  return scaled
}

async function depositInto(vault: MorphoVault, owner: Hex, amount: bigint): Promise<void> {
  await ensureApproval(vault.address, amount, owner)
  const data = encodeFunctionData({ abi, functionName: 'deposit', args: [amount, owner] })
  const txHash = await sendTx(
    vault.address,
    data,
    `deposit ${formatUnits(amount, vault.asset.decimals)} → ${vault.symbol}`,
  )
  logEvent('vault_deposit', {
    vaultName: vault.name,
    vaultAddress: vault.address,
    amount: amount.toString(),
    amountFormatted: formatUnits(amount, vault.asset.decimals),
    txHash,
  })
}

async function withdrawFrom(vault: MorphoVault, owner: Hex, amount: bigint): Promise<void> {
  const data = encodeFunctionData({ abi, functionName: 'withdraw', args: [amount, owner, owner] })
  const txHash = await sendTx(
    vault.address,
    data,
    `withdraw ${formatUnits(amount, vault.asset.decimals)} ← ${vault.symbol}`,
  )
  logEvent('vault_redeem', {
    vaultName: vault.name,
    vaultAddress: vault.address,
    amount: amount.toString(),
    amountFormatted: formatUnits(amount, vault.asset.decimals),
    txHash,
  })
}

// -----------------------------------------------------------------------------
// Reconciliation — find existing positions across watched vaults at startup so
// process restarts pick up where the previous instance left off.
// -----------------------------------------------------------------------------

interface HeldPosition { vault: MorphoVault; shares: bigint; assets: bigint }

// -----------------------------------------------------------------------------
// Aave V3 idle-fallback helpers — supply idle asset to Aave to capture money-
// market yield while waiting for a Morpho rebalance signal.
// -----------------------------------------------------------------------------

async function aaveSuppliedAssets(owner: Hex): Promise<bigint> {
  if (!IDLE_FALLBACK_ENABLED) return 0n
  return (await publicClient.readContract({
    address: AAVE_ATOKEN as Hex,
    abi,
    functionName: 'balanceOf',
    args: [owner],
  })) as bigint
}

async function aaveSupply(owner: Hex, amount: bigint, decimals: number, priceUsd: number): Promise<void> {
  if (!IDLE_FALLBACK_ENABLED) return
  await ensureApproval(AAVE_POOL as Hex, amount, owner)
  const data = encodeFunctionData({
    abi: aaveAbi,
    functionName: 'supply',
    args: [ASSET!, amount, owner, 0],
  })
  const txHash = await sendTx(AAVE_POOL as Hex, data, `aave supply ${formatUnits(amount, decimals)}`)
  const usd = Number(formatUnits(amount, decimals)) * priceUsd
  logEvent('idle_fallback_supply', {
    pool: AAVE_POOL,
    amount: amount.toString(),
    amountFormatted: formatUnits(amount, decimals),
    amountUsd: usd,
    txHash,
  })
  void sendMatrixAlert(`swept ~$${usd.toFixed(2)} idle to aave (no morpho leg needed top-up)`)
}

async function aaveWithdraw(owner: Hex, amount: bigint, decimals: number, priceUsd: number): Promise<bigint> {
  if (!IDLE_FALLBACK_ENABLED) return 0n
  const data = encodeFunctionData({
    abi: aaveAbi,
    functionName: 'withdraw',
    args: [ASSET!, amount, owner],
  })
  const txHash = await sendTx(AAVE_POOL as Hex, data, `aave withdraw ${formatUnits(amount, decimals)}`)
  const usd = Number(formatUnits(amount, decimals)) * priceUsd
  logEvent('idle_fallback_withdraw', {
    pool: AAVE_POOL,
    amount: amount.toString(),
    amountFormatted: formatUnits(amount, decimals),
    amountUsd: usd,
    txHash,
  })
  void sendMatrixAlert(`pulled ~$${usd.toFixed(2)} from aave to fund a morpho leg top-up`)
  return amount
}

// -----------------------------------------------------------------------------
// Reward claiming — fetch claimable rewards from the Morpho rewards API and
// submit Merkle-proof claim() calls against each distributor. Runs on its own
// cadence (REWARDS_CLAIM_INTERVAL_MS) independent of the rebalance loop.
// -----------------------------------------------------------------------------

interface ClaimableReward {
  distributor: Hex
  reward: Hex
  claimable: string
  proof: Hex[]
  symbol?: string
  decimals?: number
}

async function fetchClaimableRewards(owner: Hex): Promise<ClaimableReward[]> {
  if (!REWARDS_CLAIM_ENABLED) return []
  const url = REWARDS_API_URL
    .replace('{address}', owner)
    .replace('{chainId}', String(CHAIN_ID))
  try {
    const res = await request(url, { method: 'GET' })
    if (res.statusCode >= 400) {
      log('warn', 'rewards_api_error', { status: res.statusCode })
      return []
    }
    const body = await res.body.json() as unknown
    // Normalize a few common API shapes:
    //   { data: [{ distributor, asset, claimable, proof }] }
    //   [{ distributor, asset, amount, proof }]
    //   { rewards: [...] }
    const raw = (body as { data?: unknown; rewards?: unknown })
    let arr: unknown
    if (Array.isArray(body)) arr = body
    else if (Array.isArray(raw.data)) arr = raw.data
    else if (Array.isArray(raw.rewards)) arr = raw.rewards
    else arr = []
    const items = arr as Array<Record<string, unknown>>

    const out: ClaimableReward[] = []
    for (const item of items) {
      const dist = ((item.distributor as Record<string, unknown>)?.address ?? item.distributor) as Hex | undefined
      const reward = ((item.asset as Record<string, unknown>)?.address ?? item.reward ?? item.token) as Hex | undefined
      const claimableRaw = (item.claimable
        ?? (item.amount as Record<string, unknown>)?.claimable_now
        ?? (item.amount as Record<string, unknown>)?.value
        ?? item.amount) as string | number | undefined
      const proof = (item.proof ?? (item as Record<string, unknown>).merkle_proof) as Hex[] | undefined
      if (!dist || !reward || claimableRaw == null || !Array.isArray(proof)) continue
      const claimable = typeof claimableRaw === 'number' ? BigInt(Math.floor(claimableRaw)).toString() : String(claimableRaw)
      out.push({
        distributor: dist,
        reward,
        claimable,
        proof,
        symbol: ((item.asset as Record<string, unknown>)?.symbol as string | undefined),
        decimals: ((item.asset as Record<string, unknown>)?.decimals as number | undefined),
      })
    }
    return out
  } catch (err) {
    log('warn', 'rewards_fetch_failed', { error: err instanceof Error ? err.message : String(err) })
    return []
  }
}

async function claimRewardsOnce(owner: Hex): Promise<void> {
  if (!REWARDS_CLAIM_ENABLED) return
  const claims = await fetchClaimableRewards(owner)
  if (claims.length === 0) {
    log('info', 'rewards_none_claimable', {})
    return
  }
  for (const c of claims) {
    let claimable: bigint
    try { claimable = BigInt(c.claimable) } catch { continue }
    if (claimable < REWARDS_MIN_CLAIM_WEI) {
      log('info', 'rewards_below_min', {
        reward: c.reward,
        claimable: c.claimable,
        symbol: c.symbol,
      })
      continue
    }
    const data = encodeFunctionData({
      abi: urdAbi,
      functionName: 'claim',
      args: [owner, c.reward, claimable, c.proof],
    })
    const txHash = await sendTx(c.distributor, data, `claim ${c.symbol ?? c.reward}`)
    const formatted = c.decimals != null ? formatUnits(claimable, c.decimals) : c.claimable
    logEvent('rewards_claimed', {
      distributor: c.distributor,
      reward: c.reward,
      symbol: c.symbol,
      claimable: c.claimable,
      claimableFormatted: formatted,
      txHash,
    })
    void sendMatrixAlert(`claimed ${formatted} ${c.symbol ?? 'reward'} from ${c.distributor.slice(0, 10)}…`)
  }
}

async function reconcilePositions(owner: Hex, vaults: MorphoVault[]): Promise<HeldPosition[]> {
  const balances = await Promise.all(
    vaults.map(async (v) => ({ vault: v, ...(await positionInVault(v.address, owner)) })),
  )
  return balances.filter((p) => p.shares > 0n)
}

// -----------------------------------------------------------------------------
// State (in-memory; per-process)
// -----------------------------------------------------------------------------

let rebalanceCount = 0

// -----------------------------------------------------------------------------
// Main loop
// -----------------------------------------------------------------------------

async function tick(owner: Hex): Promise<void> {
  const decimals = await assetDecimals()
  const vaults = (await fetchVaults()).filter((v) => typeof v.state?.netApy === 'number')
  if (vaults.length === 0) {
    log('warn', 'no_vaults_for_asset', { asset: ASSET, chainId: CHAIN_ID })
    return
  }

  // Rank vaults by net APY descending and pick the top N as the target set.
  vaults.sort((a, b) => (b.state!.netApy! - a.state!.netApy!))
  const targetVaults = vaults.slice(0, Math.min(TOP_N, vaults.length))
  const best = vaults[0]
  const bestApyBps = Math.round(best.state!.netApy! * 10_000)
  const blendedApyBps = Math.round(
    (targetVaults.reduce((s, v) => s + (v.state?.netApy ?? 0), 0) / targetVaults.length) * 10_000,
  )

  log('info', 'cycle', {
    chainId: CHAIN_ID,
    asset: ASSET,
    vaultsConsidered: vaults.length,
    topN: targetVaults.length,
    targets: targetVaults.map((v) => ({ symbol: v.symbol, apyBps: Math.round((v.state?.netApy ?? 0) * 10_000) })),
    blendedApyBps,
    bestSymbol: best.symbol,
    bestNetApyBps: bestApyBps,
  })

  // Walk current positions across ALL fetched vaults so we notice positions
  // that have dropped out of the top-N target set.
  const heldList = await reconcilePositions(owner, vaults)
  const idleAssets = await assetBalance(owner)
  const aaveAssets = await aaveSuppliedAssets(owner)
  const idleUsdc = USDC_ADDRESS.toLowerCase() === ASSET!.toLowerCase()
    ? Number(formatUnits(idleAssets, decimals))
    : null
  if (idleUsdc != null) {
    logEvent('balance_snapshot', {
      usdcBalance: idleUsdc,
      aaveBalance: Number(formatUnits(aaveAssets, decimals)),
    })
  }

  // Total portfolio value in USD = held morpho vaults + Aave floor + wallet idle
  const priceUsdAsset = best.asset.priceUsd ?? 1
  const heldUsd = heldList.reduce((sum, p) => {
    const priceUsd = p.vault.asset.priceUsd ?? 1
    const tokens = Number(formatUnits(p.assets, p.vault.asset.decimals))
    return sum + tokens * priceUsd
  }, 0)
  const idleUsd = priceUsdAsset * Number(formatUnits(idleAssets, decimals))
  const aaveUsd = priceUsdAsset * Number(formatUnits(aaveAssets, decimals))
  const totalUsd = heldUsd + idleUsd + aaveUsd
  const cappedTotalUsd = MAX_DEPOSIT_USD > 0 ? Math.min(totalUsd, MAX_DEPOSIT_USD) : totalUsd

  for (const held of heldList) {
    const heldApyBps = Math.round((held.vault.state?.netApy ?? 0) * 10_000)
    logEvent('position_status', {
      vaultAddress: held.vault.address,
      vaultName: held.vault.name,
      vaultSymbol: held.vault.symbol,
      shares: held.shares.toString(),
      assets: held.assets.toString(),
      assetsFormatted: formatUnits(held.assets, held.vault.asset.decimals),
      heldNetApyBps: heldApyBps,
      bestNetApyBps: bestApyBps,
      apyDeltaBps: bestApyBps - heldApyBps,
      rebalanceCount,
      totalAssetsUsdAcrossVaults: heldUsd,
      totalAssetsUsdIncludingIdle: totalUsd,
    })
  }

  // Equal-weight target: split capital evenly across the top-N target set.
  const perLegTargetUsd = cappedTotalUsd / targetVaults.length
  const targetAddresses = new Set(targetVaults.map((v) => v.address.toLowerCase()))

  logEvent('portfolio_target', {
    topN: targetVaults.length,
    perLegTargetUsd,
    totalUsd,
    cappedTotalUsd,
    legs: targetVaults.map((v) => ({ symbol: v.symbol, address: v.address })),
  })

  // 1. Exit stale positions — held vault no longer in target set → withdraw fully
  let didChange = false
  for (const held of heldList) {
    if (targetAddresses.has(held.vault.address.toLowerCase())) continue
    log('info', 'exit_stale_leg', { vault: held.vault.symbol, reason: 'no longer in top N' })
    logEvent('rebalance_start', {
      fromVaultAddress: held.vault.address,
      fromVaultName: held.vault.name,
      reason: 'leg_dropped_from_top_n',
    })
    void sendMatrixAlert(
      `exiting ${held.vault.symbol} — no longer in top ${TOP_N} (now at rank > ${TOP_N})`,
    )
    await withdrawFrom(held.vault, owner, held.assets)
    rebalanceCount++
    logEvent('rebalance_complete', {
      fromVaultName: held.vault.name,
      reason: 'leg_dropped_from_top_n',
      rebalanceNumber: rebalanceCount,
    })
    didChange = true
  }

  // 2. Drift-correct each target leg toward perLegTargetUsd
  for (const target of targetVaults) {
    const held = heldList.find((p) => p.vault.address.toLowerCase() === target.address.toLowerCase())
    const priceUsd = target.asset.priceUsd ?? 1
    const heldUsdLeg = held
      ? Number(formatUnits(held.assets, target.asset.decimals)) * priceUsd
      : 0
    const driftUsd = perLegTargetUsd - heldUsdLeg
    const driftBps = totalUsd > 0 ? Math.round((Math.abs(driftUsd) / totalUsd) * 10_000) : 0

    logEvent('portfolio_drift', {
      vaultSymbol: target.symbol,
      vaultAddress: target.address,
      heldUsd: heldUsdLeg,
      targetUsd: perLegTargetUsd,
      driftUsd,
      driftBps,
      thresholdBps: REBAL_DRIFT_BPS,
    })

    if (driftBps < REBAL_DRIFT_BPS) continue

    if (driftUsd > 0) {
      // Top up — convert USD drift to base units, capped by what's available.
      // If wallet idle is short, pull from the Aave floor first.
      const wantAmount = toBaseUnits(driftUsd, priceUsd, decimals)
      let currentIdle = await assetBalance(owner)
      if (currentIdle < wantAmount && IDLE_FALLBACK_ENABLED) {
        const shortfall = wantAmount - currentIdle
        const aaveBal = await aaveSuppliedAssets(owner)
        const pullAmount = aaveBal < shortfall ? aaveBal : shortfall
        if (pullAmount > 0n) {
          await aaveWithdraw(owner, pullAmount, decimals, priceUsdAsset)
          currentIdle = await assetBalance(owner)
        }
      }
      const amount = currentIdle < wantAmount ? currentIdle : wantAmount
      if (amount === 0n) {
        log('info', 'topup_skip_no_idle', { vault: target.symbol, wantUsd: driftUsd })
        continue
      }
      logEvent('rebalance_start', {
        toVaultAddress: target.address,
        toVaultName: target.name,
        amountUsd: driftUsd,
        reason: 'topup_to_target_weight',
      })
      void sendMatrixAlert(
        `topping up ${target.symbol} (${fmtBps(Math.round((target.state?.netApy ?? 0) * 10_000))}) by ~$${driftUsd.toFixed(2)} to hit target weight`,
      )
      await depositInto(target, owner, amount)
      rebalanceCount++
      logEvent('rebalance_complete', {
        toVaultName: target.name,
        reason: 'topup_to_target_weight',
        rebalanceNumber: rebalanceCount,
      })
      didChange = true
    } else {
      // Over-allocated — trim by withdrawing the excess
      const excessUsd = -driftUsd
      const excessAmount = toBaseUnits(excessUsd, priceUsd, target.asset.decimals)
      if (excessAmount === 0n || !held) continue
      logEvent('rebalance_start', {
        fromVaultAddress: target.address,
        fromVaultName: target.name,
        amountUsd: excessUsd,
        reason: 'trim_over_allocation',
      })
      void sendMatrixAlert(
        `trimming ${target.symbol} by ~$${excessUsd.toFixed(2)} — leg over target weight`,
      )
      await withdrawFrom(target, owner, excessAmount)
      rebalanceCount++
      logEvent('rebalance_complete', {
        fromVaultName: target.name,
        reason: 'trim_over_allocation',
        rebalanceNumber: rebalanceCount,
      })
      didChange = true
    }
  }

  if (!didChange) {
    log('info', 'portfolio_balanced', {
      topN: TOP_N,
      driftThresholdBps: REBAL_DRIFT_BPS,
    })
  }

  // 3. Idle-fallback sweep — anything left in the wallet after the morpho
  // legs are at target gets swept to Aave so it earns money-market yield.
  if (IDLE_FALLBACK_ENABLED) {
    const finalIdle = await assetBalance(owner)
    const finalIdleUsd = priceUsdAsset * Number(formatUnits(finalIdle, decimals))
    if (finalIdleUsd >= IDLE_FALLBACK_MIN_USD) {
      log('info', 'idle_fallback_sweep', { idleUsd: finalIdleUsd, threshold: IDLE_FALLBACK_MIN_USD })
      await aaveSupply(owner, finalIdle, decimals, priceUsdAsset)
    } else {
      log('info', 'idle_fallback_skip', {
        idleUsd: finalIdleUsd,
        threshold: IDLE_FALLBACK_MIN_USD,
        reason: 'below threshold',
      })
    }
  }
}

let stopping = false
let consecutiveErrors = 0
let lastClaimAt = 0
const MAX_CONSECUTIVE_ERRORS = 3

async function main(): Promise<void> {
  const owner = await whoami()
  log('info', 'agent_starting', {
    chainId: CHAIN_ID,
    asset: ASSET,
    maxDepositUsd: MAX_DEPOSIT_USD,
    minDeltaBps: MIN_DELTA_BPS,
    pollIntervalMs: POLL_MS,
    dryRun: DRY_RUN,
    watchedVaults: WATCHED_VAULTS.length || 'auto (filter by asset)',
    owner,
  })

  // Write PID file before installing signal handlers so a supervisor that
  // SIGTERMs us early during startup still sees us as alive.
  if (WRITE_PID_FILE) {
    try {
      fs.writeFileSync(PID_FILE, String(process.pid))
      process.on('exit', () => { try { fs.unlinkSync(PID_FILE) } catch {} })
      log('info', 'pid_file_written', { path: PID_FILE, pid: process.pid })
    } catch (err) {
      log('warn', 'pid_file_write_failed', { path: PID_FILE, error: err instanceof Error ? err.message : String(err) })
    }
  }

  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.on(sig, () => {
      log('info', 'shutdown_signal', { signal: sig })
      stopping = true
    })
  }

  while (!stopping) {
    try {
      await tick(owner)
      consecutiveErrors = 0
      if (REWARDS_CLAIM_ENABLED && Date.now() - lastClaimAt >= REWARDS_CLAIM_INTERVAL_MS) {
        try {
          await claimRewardsOnce(owner)
        } catch (err) {
          log('warn', 'rewards_claim_failed', { error: err instanceof Error ? err.message : String(err) })
        }
        lastClaimAt = Date.now()
      }
    } catch (err) {
      consecutiveErrors++
      const msg = err instanceof Error ? err.message : String(err)
      log('error', 'tick_failed', { error: msg, consecutiveErrors })
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        log('error', 'too_many_consecutive_errors', { consecutiveErrors })
        process.exit(1)
      }
    }
    if (stopping) break
    log('info', 'next_check', { inMs: POLL_MS })
    const slices = Math.max(1, Math.ceil(POLL_MS / 1000))
    for (let i = 0; i < slices && !stopping; i++) {
      await new Promise((r) => setTimeout(r, Math.min(1000, POLL_MS)))
    }
  }

  log('info', 'agent_stopped', {})
}

main().catch((err) => {
  log('error', 'fatal', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
