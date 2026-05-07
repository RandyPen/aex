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

// Optional explicit watched-vault allowlist. If unset, the agent queries the
// Morpho API and considers every vault accepting AGENT_ASSET on this chain.
const WATCHED_VAULTS = (process.env.WATCHED_VAULTS ?? '')
  .split(/[,\s]+/)
  .map((s) => s.trim())
  .filter((s) => /^0x[0-9a-fA-F]{40}$/.test(s)) as Hex[]

// Default ON. Going live requires AGENT_DRY_RUN=0 explicitly — anything else
// (typo'd 'true', '0 ', missing, blank) keeps the agent in dry-run.
const DRY_RUN = process.env.AGENT_DRY_RUN !== '0'

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

  // Sort by net APY descending
  vaults.sort((a, b) => (b.state!.netApy! - a.state!.netApy!))
  const best = vaults[0]
  const bestApyBps = Math.round(best.state!.netApy! * 10_000)

  log('info', 'cycle', {
    chainId: CHAIN_ID,
    asset: ASSET,
    vaultsConsidered: vaults.length,
    bestSymbol: best.symbol,
    bestNetApyBps: bestApyBps,
  })

  // Walk current positions
  const heldList = await reconcilePositions(owner, vaults)
  const usdcBalance = USDC_ADDRESS.toLowerCase() === ASSET!.toLowerCase()
    ? Number(formatUnits(await assetBalance(owner), decimals))
    : null
  if (usdcBalance != null) {
    logEvent('balance_snapshot', { usdcBalance })
  }

  // Emit snapshot events for the current position(s)
  const totalAssetsUsdAcrossVaults = heldList.reduce((sum, p) => {
    const priceUsd = p.vault.asset.priceUsd ?? 1
    const tokens = Number(formatUnits(p.assets, p.vault.asset.decimals))
    return sum + tokens * priceUsd
  }, 0)

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
      totalAssetsUsdAcrossVaults,
    })
  }

  const priceUsd = best.asset.priceUsd ?? 1
  const maxAmount = toBaseUnits(MAX_DEPOSIT_USD, priceUsd, decimals)

  if (heldList.length === 0) {
    // Open initial position in the best vault, capped
    log('info', 'no_position_opening_initial', {
      vault: best.symbol,
      maxDepositUsd: MAX_DEPOSIT_USD,
    })
    logEvent('no_positions_opening', { vault: best.address })
    await depositInto(best, owner, maxAmount)
    return
  }

  // Pick a single primary held position (if multiple, pick the largest)
  const primary = heldList.sort((a, b) => (a.assets > b.assets ? -1 : 1))[0]
  if (heldList.length > 1) {
    log('warn', 'multiple_positions_held', {
      count: heldList.length,
      addresses: heldList.map((p) => p.vault.address),
      pickedPrimary: primary.vault.address,
    })
  }

  if (primary.vault.address.toLowerCase() === best.address.toLowerCase()) {
    log('info', 'already_in_best_vault', { vault: best.symbol })
    return
  }

  const heldApyBps = Math.round((primary.vault.state?.netApy ?? 0) * 10_000)
  const delta = bestApyBps - heldApyBps
  log('info', 'apy_comparison', {
    held: primary.vault.symbol,
    heldApyBps,
    best: best.symbol,
    bestApyBps,
    deltaBps: delta,
    minDeltaBps: MIN_DELTA_BPS,
  })

  if (delta < MIN_DELTA_BPS) {
    log('info', 'delta_below_threshold_holding', { deltaBps: delta, minDeltaBps: MIN_DELTA_BPS })
    return
  }

  log('info', 'rebalancing', { from: primary.vault.symbol, to: best.symbol, deltaBps: delta })
  logEvent('rebalance_start', {
    fromVaultAddress: primary.vault.address,
    fromVaultName: primary.vault.name,
    toVaultAddress: best.address,
    toVaultName: best.name,
    apyDeltaBps: delta,
  })

  await withdrawFrom(primary.vault, owner, primary.assets)

  const redeposit = primary.assets < maxAmount ? primary.assets : maxAmount
  await depositInto(best, owner, redeposit)
  rebalanceCount++
  logEvent('rebalance_complete', {
    fromVaultName: primary.vault.name,
    toVaultName: best.name,
    rebalanceNumber: rebalanceCount,
  })
}

let stopping = false
let consecutiveErrors = 0
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
