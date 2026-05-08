import 'dotenv/config'
import { execa } from 'execa'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Hex,
} from 'viem'
import { base } from 'viem/chains'

const TAG = '[{{projectName}}]'
const CHAIN_ID = {{chainId}}
const RPC_URL = process.env.RPC_URL ?? 'https://mainnet.base.org'
const POSITION_ID = process.env.AGENT_POSITION_ID
const MAX_DEPOSIT = Number(process.env.AGENT_MAX_DEPOSIT_USD)
const RANGE_BPS = Number(process.env.AGENT_RANGE_BPS ?? 500)
const MAX_SLIPPAGE_BPS = Number(process.env.AGENT_MAX_SLIPPAGE_BPS ?? 200)
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 15 * 60 * 1000)
// Default ON. Going live requires AGENT_DRY_RUN=0 explicitly — anything else
// (typo'd 'true', '0 ', missing, blank) keeps the agent in dry-run.
const DRY_RUN = process.env.AGENT_DRY_RUN !== '0'

// Verified 2026-04-29 against Uniswap v3 Base deployment docs:
// https://developers.uniswap.org/contracts/v3/reference/deployments/base-deployments
const NPM_ADDRESS: Hex = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1'
const FACTORY_ADDRESS: Hex = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'

if (!POSITION_ID || !/^\d+$/.test(POSITION_ID)) {
  console.error(`${TAG} AGENT_POSITION_ID must be a decimal NFT token id`)
  process.exit(1)
}
if (!Number.isFinite(MAX_DEPOSIT) || MAX_DEPOSIT <= 0) {
  console.error(`${TAG} AGENT_MAX_DEPOSIT_USD must be a positive number`)
  process.exit(1)
}
if (!Number.isFinite(RANGE_BPS) || RANGE_BPS <= 0 || RANGE_BPS > 50_000) {
  console.error(`${TAG} AGENT_RANGE_BPS must be a positive integer (1..50000)`)
  process.exit(1)
}
if (!Number.isFinite(MAX_SLIPPAGE_BPS) || MAX_SLIPPAGE_BPS < 0 || MAX_SLIPPAGE_BPS > 2000) {
  console.error(`${TAG} AGENT_MAX_SLIPPAGE_BPS must be 0..2000 (basis points; 200 = 2%)`)
  process.exit(1)
}

// INonfungiblePositionManager ABI slice — verified 2026-04-29 against
// Uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol
const npmAbi = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) returns (uint256 amount0, uint256 amount1)',
  'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) returns (uint256 amount0, uint256 amount1)',
  'function burn(uint256 tokenId)',
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
])

// IUniswapV3Pool slice — only slot0 needed to read current tick
const poolAbi = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function tickSpacing() view returns (int24)',
])

// IUniswapV3Factory.getPool
const factoryAbi = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)',
])

interface PositionState {
  token0: Hex
  token1: Hex
  fee: number
  tickLower: number
  tickUpper: number
  liquidity: bigint
}

interface PoolState {
  pool: Hex
  currentTick: number
  tickSpacing: number
}

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })

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
  const { stdout } = await execa('waap-cli', ['whoami', '--json'])
  const parsed = parseWaapJson<{ evmWalletAddress?: string }>(stdout)
  if (!parsed.evmWalletAddress) {
    throw new Error('no EVM wallet address — run `waap-cli signup` first')
  }
  return parsed.evmWalletAddress as Hex
}

async function sendTx(to: Hex, data: Hex, label: string): Promise<string> {
  if (DRY_RUN) {
    console.log(`${TAG} [DRY_RUN] would send tx → ${label}`)
    return '0xdryrun'
  }
  const { stdout } = await execa('waap-cli', [
    'send-tx',
    '--to',
    to,
    '--value',
    '0',
    '--data',
    data,
    '--chain',
    `evm:${CHAIN_ID}`,
  ])
  // send-tx doesn't have a stable --json yet — extract the hash from text.
  const match = stdout.match(/0x[a-fA-F0-9]{64}/)
  if (!match) {
    throw new Error(`Could not extract tx hash: ${stdout.slice(0, 200)}`)
  }
  console.log(`${TAG} ${label} submitted: ${match[0]}`)
  return match[0]
}

async function readPosition(): Promise<PositionState> {
  const result = await publicClient.readContract({
    address: NPM_ADDRESS,
    abi: npmAbi,
    functionName: 'positions',
    args: [BigInt(POSITION_ID!)],
  })
  // result is the 12-tuple — destructure the fields we need
  const [, , token0, token1, fee, tickLower, tickUpper, liquidity] = result as readonly [
    bigint, Hex, Hex, Hex, number, number, number, bigint, bigint, bigint, bigint, bigint,
  ]
  return {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    liquidity,
  }
}

async function readPool(pos: PositionState): Promise<PoolState> {
  const pool = (await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getPool',
    args: [pos.token0, pos.token1, pos.fee],
  })) as Hex
  const [slot0, tickSpacing] = await Promise.all([
    publicClient.readContract({ address: pool, abi: poolAbi, functionName: 'slot0' }),
    publicClient.readContract({ address: pool, abi: poolAbi, functionName: 'tickSpacing' }),
  ])
  const currentTick = Number((slot0 as readonly unknown[])[1])
  return { pool, currentTick, tickSpacing: Number(tickSpacing) }
}

// Uniswap v3 amounts-from-liquidity. Using plain Number arithmetic — the Q96
// scaling factors cancel out, and float precision is far below the slippage
// tolerance we apply (default 200bps). For positions whose `liquidity` exceeds
// 2^53, the Number(L) cast loses precision; the slippage floor still protects
// the operator, but a Number-clean implementation should consider Q96 bigint
// math (see Uniswap v3-sdk `Position.mintAmounts`).
function sqrtPriceAtTick(tick: number): number {
  return Math.sqrt(Math.pow(1.0001, tick))
}

function expectedAmountsForLiquidity(
  liquidity: bigint,
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): { amount0: bigint; amount1: bigint } {
  const L = Number(liquidity)
  const sqrtPA = sqrtPriceAtTick(tickLower)
  const sqrtPB = sqrtPriceAtTick(tickUpper)
  const sqrtP = sqrtPriceAtTick(currentTick)

  let amount0 = 0
  let amount1 = 0
  if (currentTick < tickLower) {
    amount0 = (L * (sqrtPB - sqrtPA)) / (sqrtPA * sqrtPB)
  } else if (currentTick < tickUpper) {
    amount0 = (L * (sqrtPB - sqrtP)) / (sqrtP * sqrtPB)
    amount1 = L * (sqrtP - sqrtPA)
  } else {
    amount1 = L * (sqrtPB - sqrtPA)
  }
  return {
    amount0: BigInt(Math.max(0, Math.floor(amount0))),
    amount1: BigInt(Math.max(0, Math.floor(amount1))),
  }
}

function applySlippageFloor(amount: bigint, slippageBps: number): bigint {
  if (slippageBps === 0) return amount
  return (amount * BigInt(10_000 - slippageBps)) / 10_000n
}

function computeTargetRange(
  currentTick: number,
  tickSpacing: number,
): { tickLower: number; tickUpper: number } {
  const half = Math.floor(RANGE_BPS / 2)
  const align = (t: number) => Math.round(t / tickSpacing) * tickSpacing
  const tickLower = align(currentTick - half)
  const tickUpper = Math.max(align(currentTick + half), tickLower + tickSpacing)
  return { tickLower, tickUpper }
}

function isInRange(pos: PositionState, currentTick: number): boolean {
  return currentTick >= pos.tickLower && currentTick <= pos.tickUpper
}

async function rebalance(
  owner: Hex,
  pos: PositionState,
  pool: PoolState,
): Promise<void> {
  const target = computeTargetRange(pool.currentTick, pool.tickSpacing)
  console.log(
    `${TAG} rebalancing position ${POSITION_ID} from [${pos.tickLower}, ${pos.tickUpper}] → [${target.tickLower}, ${target.tickUpper}]`,
  )

  // 1. Compute slippage-protected min amounts before unwinding. Without this,
  //    a sandwich attacker could force decreaseLiquidity to receive ~0 of one
  //    token. Tolerance is bounded by AGENT_MAX_SLIPPAGE_BPS (default 200 = 2%).
  const expected = expectedAmountsForLiquidity(
    pos.liquidity,
    pool.currentTick,
    pos.tickLower,
    pos.tickUpper,
  )
  const amount0Min = applySlippageFloor(expected.amount0, MAX_SLIPPAGE_BPS)
  const amount1Min = applySlippageFloor(expected.amount1, MAX_SLIPPAGE_BPS)
  console.log(
    `${TAG} expected ${expected.amount0}/${expected.amount1} → min ${amount0Min}/${amount1Min} (max slippage ${MAX_SLIPPAGE_BPS}bps)`,
  )

  // 2. Decrease liquidity to 0 with slippage protection
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const decreaseData = encodeFunctionData({
    abi: npmAbi,
    functionName: 'decreaseLiquidity',
    args: [
      {
        tokenId: BigInt(POSITION_ID!),
        liquidity: pos.liquidity,
        amount0Min,
        amount1Min,
        deadline,
      },
    ],
  })
  await sendTx(NPM_ADDRESS, decreaseData, 'decreaseLiquidity → 0')

  // 3. Collect tokens (owed + just-decreased) to owner
  const MAX_UINT128 = 2n ** 128n - 1n
  const collectData = encodeFunctionData({
    abi: npmAbi,
    functionName: 'collect',
    args: [
      {
        tokenId: BigInt(POSITION_ID!),
        recipient: owner,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
    ],
  })
  await sendTx(NPM_ADDRESS, collectData, 'collect → owner')

  // 4. Burn the position NFT (frees the slot)
  const burnData = encodeFunctionData({
    abi: npmAbi,
    functionName: 'burn',
    args: [BigInt(POSITION_ID!)],
  })
  await sendTx(NPM_ADDRESS, burnData, `burn ${POSITION_ID}`)

  // 5. Re-mint at target range — Phase 2 (NOT IMPLEMENTED).
  //    Tokens are now in the operator's EOA. Agent intentionally stops here
  //    rather than silently leaving funds undeployed without acknowledgement.
  console.warn(
    `${TAG} ⚠ MINT_NOT_IMPLEMENTED: position drained to ${owner}; re-stake manually or wait for Phase 2. ` +
      `Target range was [${target.tickLower}, ${target.tickUpper}]. Recipe: {{recipeUrl}}`,
  )
  console.log(
    JSON.stringify({
      event: 'rebalance_drained_no_remint',
      owner,
      tokenId: POSITION_ID,
      targetTickLower: target.tickLower,
      targetTickUpper: target.tickUpper,
      maxDepositUsd: MAX_DEPOSIT,
    }),
  )
}

async function tick(owner: Hex): Promise<void> {
  const pos = await readPosition()
  if (pos.liquidity === 0n) {
    console.log(`${TAG} position ${POSITION_ID} has 0 liquidity — nothing to manage`)
    return
  }
  const pool = await readPool(pos)
  console.log(
    `${TAG} pool ${pool.pool.slice(0, 10)}… tick=${pool.currentTick} spacing=${pool.tickSpacing}`,
  )
  console.log(
    `${TAG} position range [${pos.tickLower}, ${pos.tickUpper}] · in-range=${isInRange(pos, pool.currentTick)}`,
  )

  if (isInRange(pos, pool.currentTick)) {
    console.log(`${TAG} in-range — no rebalance needed`)
    return
  }
  await rebalance(owner, pos, pool)
}

async function main(): Promise<void> {
  console.log(
    `${TAG} chain=Base(${CHAIN_ID}) position=${POSITION_ID} range=±${RANGE_BPS / 2}bps max=$${MAX_DEPOSIT} dry_run=${DRY_RUN}`,
  )
  const owner = await whoami()
  console.log(`${TAG} wallet: ${owner}`)

  while (true) {
    try {
      await tick(owner)
    } catch (err) {
      console.error(`${TAG} tick failed:`, err instanceof Error ? err.message : err)
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

main().catch((err) => {
  console.error(`${TAG} fatal:`, err)
  process.exit(1)
})
