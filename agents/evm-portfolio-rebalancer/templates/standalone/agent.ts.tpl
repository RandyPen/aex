import 'dotenv/config'
import { execa } from 'execa'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from 'viem'
import { base } from 'viem/chains'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Constants and configuration
// ---------------------------------------------------------------------------

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = {{chainId}}

const TARGET_TOKEN = process.env.TARGET_TOKEN as Address
const QUOTE_TOKEN = process.env.QUOTE_TOKEN as Address
const TARGET_ALLOCATION_USD = Number(process.env.TARGET_ALLOCATION_USD)
const HIGH_PRICE_THRESHOLD = Number(process.env.HIGH_PRICE_THRESHOLD)
const LOW_PRICE_THRESHOLD = Number(process.env.LOW_PRICE_THRESHOLD)
const DEX_ROUTER = process.env.DEX_ROUTER as Address
const POOL_ADDRESS = process.env.POOL_ADDRESS as Address
const POOL_FEE = Number(process.env.POOL_FEE ?? '3000')
const TARGET_DECIMALS = Number(process.env.TARGET_DECIMALS ?? '18')
const QUOTE_DECIMALS = Number(process.env.QUOTE_DECIMALS ?? '6')
const TOKEN0_IS_TARGET = (process.env.TOKEN0_IS_TARGET ?? 'true') === 'true'
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? '30000')
const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS ?? '50')
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)

// Watchdog integration — writes a PID file on startup so external supervisors
// (systemd Type=simple + a tailer, or a bash watchdog) can detect liveness.
// Defaults to enabled to match the aex Hetzner deployment pattern. Set
// WRITE_PID_FILE=false to opt out (e.g. local dev where stale .pid files
// during crashes are annoying).
const WRITE_PID_FILE = (process.env.WRITE_PID_FILE ?? 'true').toLowerCase() !== 'false'
const PID_FILE = process.env.PID_FILE ?? path.join(process.cwd(), 'agent.pid')

// ---------------------------------------------------------------------------
// Validate required config
// ---------------------------------------------------------------------------

function validateConfig(): void {
  const required: [string, unknown][] = [
    ['TARGET_TOKEN', TARGET_TOKEN],
    ['QUOTE_TOKEN', QUOTE_TOKEN],
    ['TARGET_ALLOCATION_USD', TARGET_ALLOCATION_USD],
    ['HIGH_PRICE_THRESHOLD', HIGH_PRICE_THRESHOLD],
    ['LOW_PRICE_THRESHOLD', LOW_PRICE_THRESHOLD],
    ['DEX_ROUTER', DEX_ROUTER],
    ['POOL_ADDRESS', POOL_ADDRESS],
  ]

  for (const [name, value] of required) {
    if (!value && value !== 0) {
      console.error(`${TAG} ${name} is required but not set`)
      process.exit(1)
    }
  }

  if (!Number.isFinite(TARGET_ALLOCATION_USD) || TARGET_ALLOCATION_USD <= 0) {
    console.error(`${TAG} TARGET_ALLOCATION_USD must be a positive number`)
    process.exit(1)
  }
  if (!Number.isFinite(HIGH_PRICE_THRESHOLD) || HIGH_PRICE_THRESHOLD <= 0) {
    console.error(`${TAG} HIGH_PRICE_THRESHOLD must be a positive number`)
    process.exit(1)
  }
  if (!Number.isFinite(LOW_PRICE_THRESHOLD) || LOW_PRICE_THRESHOLD <= 0) {
    console.error(`${TAG} LOW_PRICE_THRESHOLD must be a positive number`)
    process.exit(1)
  }
  if (HIGH_PRICE_THRESHOLD <= LOW_PRICE_THRESHOLD) {
    console.error(`${TAG} HIGH_PRICE_THRESHOLD must be greater than LOW_PRICE_THRESHOLD`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Structured logging -- JSONL to stdout + file for AEX dashboard ingest
// ---------------------------------------------------------------------------

function ensureLogDir(): void {
  const dir = path.dirname(LOG_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function log(level: string, message: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), agent: AGENT_ID, level, message, ...data }
  console.log(JSON.stringify(entry))
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhoamiResult {
  evmWalletAddress?: string
  suiWalletAddress?: string
  email?: string
}

interface RebalanceRecord {
  timestamp: string
  direction: 'buy' | 'sell'
  price: number
  amountUsd: number
  txHash?: string
}

// ---------------------------------------------------------------------------
// Rebalance history
// ---------------------------------------------------------------------------

const rebalanceHistory: RebalanceRecord[] = []

// ---------------------------------------------------------------------------
// WaaP CLI helpers
// ---------------------------------------------------------------------------

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

async function whoami(): Promise<WhoamiResult> {
  const { stdout } = await execa('waap-cli', ['whoami', '--json'])
  return parseWaapJson<WhoamiResult>(stdout)
}

async function sendTx(to: Address, data: Hex, value: string = '0'): Promise<{ txHash: string }> {
  const { stdout } = await execa('waap-cli', [
    'send-tx',
    '--chain-id', String(CHAIN_ID),
    '--to', to,
    '--data', data,
    '--value', value,
    '--json',
  ])
  return parseWaapJson<{ txHash: string }>(stdout)
}

// ---------------------------------------------------------------------------
// Viem public client for reading on-chain state
// ---------------------------------------------------------------------------

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// ---------------------------------------------------------------------------
// Uniswap V3 ABIs (minimal)
// ---------------------------------------------------------------------------

const poolAbi = parseAbi([
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
])

const erc20Abi = parseAbi([
  'function balanceOf(address owner) external view returns (uint256)',
])

const swapRouterAbi = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
])

// ---------------------------------------------------------------------------
// Price calculation from sqrtPriceX96
// ---------------------------------------------------------------------------

function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = (sqrtPriceX96 / 2^96)^2
  // price represents token1/token0 in raw units
  const Q96 = 2n ** 96n

  // Use floating point for the conversion since we only need ~6 sig figs
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96)
  const rawPrice = sqrtPrice * sqrtPrice

  // Adjust for decimals: rawPrice = token1_raw / token0_raw
  // If token0 is TARGET (e.g. WETH 18 dec) and token1 is QUOTE (e.g. USDC 6 dec):
  //   humanPrice = rawPrice * 10^(token0Decimals - token1Decimals)
  // If token0 is QUOTE and token1 is TARGET:
  //   humanPrice = (1/rawPrice) * 10^(token1Decimals - token0Decimals)

  if (TOKEN0_IS_TARGET) {
    // price = token1/token0 in raw, so price of target in quote terms:
    // humanPrice = rawPrice * 10^(targetDecimals - quoteDecimals)
    return rawPrice * Math.pow(10, TARGET_DECIMALS - QUOTE_DECIMALS)
  } else {
    // token0 is quote, token1 is target
    // rawPrice = target_raw / quote_raw (inverted perspective)
    // price of target in quote = (1/rawPrice) * 10^(quoteDecimals - targetDecimals)
    if (rawPrice === 0) return 0
    return (1 / rawPrice) * Math.pow(10, QUOTE_DECIMALS - TARGET_DECIMALS)
  }
}

// ---------------------------------------------------------------------------
// Read current price from pool
// ---------------------------------------------------------------------------

async function getCurrentPrice(): Promise<number> {
  const result = await publicClient.readContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: 'slot0',
  })

  const sqrtPriceX96 = result[0] as bigint
  return sqrtPriceX96ToPrice(sqrtPriceX96)
}

// ---------------------------------------------------------------------------
// Read token balance
// ---------------------------------------------------------------------------

async function getTokenBalance(token: Address, wallet: Address): Promise<bigint> {
  return await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [wallet],
  }) as bigint
}

// ---------------------------------------------------------------------------
// Swap encoding
// ---------------------------------------------------------------------------

function encodeExactInputSingle(
  tokenIn: Address,
  tokenOut: Address,
  fee: number,
  recipient: Address,
  amountIn: bigint,
  amountOutMinimum: bigint,
): Hex {
  return encodeFunctionData({
    abi: swapRouterAbi,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: 0n,
    }],
  })
}

// ---------------------------------------------------------------------------
// Rebalance logic
// ---------------------------------------------------------------------------

async function executeRebalance(
  direction: 'buy' | 'sell',
  amountUsd: number,
  currentPrice: number,
  wallet: Address,
): Promise<void> {
  log('info', 'rebalance_triggered', { direction, amountUsd, currentPrice })

  let tokenIn: Address
  let tokenOut: Address
  let amountIn: bigint
  let amountOutMinimum: bigint

  if (direction === 'sell') {
    // Sell TARGET_TOKEN for QUOTE_TOKEN
    tokenIn = TARGET_TOKEN
    tokenOut = QUOTE_TOKEN
    // amountUsd worth of target token at current price
    const tokenAmount = amountUsd / currentPrice
    amountIn = BigInt(Math.floor(tokenAmount * Math.pow(10, TARGET_DECIMALS)))
    // Minimum USDC out with slippage
    const minOut = amountUsd * (1 - SLIPPAGE_BPS / 10_000)
    amountOutMinimum = BigInt(Math.floor(minOut * Math.pow(10, QUOTE_DECIMALS)))
  } else {
    // Buy TARGET_TOKEN with QUOTE_TOKEN
    tokenIn = QUOTE_TOKEN
    tokenOut = TARGET_TOKEN
    amountIn = BigInt(Math.floor(amountUsd * Math.pow(10, QUOTE_DECIMALS)))
    // Minimum target tokens out with slippage
    const expectedTokens = amountUsd / currentPrice
    const minOut = expectedTokens * (1 - SLIPPAGE_BPS / 10_000)
    amountOutMinimum = BigInt(Math.floor(minOut * Math.pow(10, TARGET_DECIMALS)))
  }

  // Check that wallet has sufficient balance of tokenIn
  const balance = await getTokenBalance(tokenIn, wallet)
  if (balance < amountIn) {
    log('warn', 'rebalance_failed', {
      reason: 'insufficient_balance',
      direction,
      required: amountIn.toString(),
      available: balance.toString(),
      token: tokenIn,
    })
    return
  }

  const calldata = encodeExactInputSingle(
    tokenIn,
    tokenOut,
    POOL_FEE,
    wallet,
    amountIn,
    amountOutMinimum,
  )

  try {
    const result = await sendTx(DEX_ROUTER, calldata)
    const record: RebalanceRecord = {
      timestamp: new Date().toISOString(),
      direction,
      price: currentPrice,
      amountUsd,
      txHash: result.txHash,
    }
    rebalanceHistory.push(record)

    log('info', 'rebalance_complete', {
      direction,
      amountUsd,
      currentPrice,
      txHash: result.txHash,
      historyLength: rebalanceHistory.length,
    })
  } catch (err) {
    log('error', 'rebalance_failed', {
      direction,
      amountUsd,
      currentPrice,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

async function tick(wallet: Address): Promise<void> {
  const currentPrice = await getCurrentPrice()

  log('info', 'price_check', {
    currentPrice,
    highThreshold: HIGH_PRICE_THRESHOLD,
    lowThreshold: LOW_PRICE_THRESHOLD,
    status: currentPrice >= HIGH_PRICE_THRESHOLD ? 'above_high'
      : currentPrice <= LOW_PRICE_THRESHOLD ? 'below_low'
      : 'in_range',
  })

  // Snapshot current balances
  const targetBalance = await getTokenBalance(TARGET_TOKEN, wallet)
  const quoteBalance = await getTokenBalance(QUOTE_TOKEN, wallet)
  const targetBalanceHuman = Number(targetBalance) / Math.pow(10, TARGET_DECIMALS)
  const quoteBalanceHuman = Number(quoteBalance) / Math.pow(10, QUOTE_DECIMALS)
  const currentValueUsd = targetBalanceHuman * currentPrice

  log('info', 'balance_snapshot', {
    wallet,
    targetToken: TARGET_TOKEN,
    targetBalance: targetBalanceHuman,
    targetValueUsd: currentValueUsd,
    quoteToken: QUOTE_TOKEN,
    quoteBalance: quoteBalanceHuman,
  })

  if (currentPrice >= HIGH_PRICE_THRESHOLD) {
    // Price is high -- sell excess to get back to target allocation
    const excessUsd = currentValueUsd - TARGET_ALLOCATION_USD
    if (excessUsd > 0) {
      await executeRebalance('sell', excessUsd, currentPrice, wallet)
    } else {
      log('info', 'price_check', { note: 'price above threshold but allocation already at or below target' })
    }
  } else if (currentPrice <= LOW_PRICE_THRESHOLD) {
    // Price is low -- buy more to get back to target allocation
    const deficitUsd = TARGET_ALLOCATION_USD - currentValueUsd
    if (deficitUsd > 0) {
      // Cap by available quote balance
      const maxBuyUsd = quoteBalanceHuman
      const buyAmountUsd = Math.min(deficitUsd, maxBuyUsd)
      if (buyAmountUsd > 0) {
        await executeRebalance('buy', buyAmountUsd, currentPrice, wallet)
      } else {
        log('warn', 'price_check', { note: 'insufficient quote balance to buy', deficitUsd, quoteBalance: quoteBalanceHuman })
      }
    } else {
      log('info', 'price_check', { note: 'price below threshold but allocation already at or above target' })
    }
  } else {
    log('info', 'price_check', { note: 'in range, no action needed' })
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  validateConfig()
  ensureLogDir()

  // Write PID file on startup so a supervisor (systemd, monit, watchdog) can
  // detect liveness. Cleanly unlinked on exit.
  if (WRITE_PID_FILE) {
    try {
      fs.writeFileSync(PID_FILE, String(process.pid))
      process.on('exit', () => { try { fs.unlinkSync(PID_FILE) } catch {} })
      log('info', 'pid_file_written', { path: PID_FILE, pid: process.pid })
    } catch (err) {
      log('warn', 'pid_file_write_failed', { path: PID_FILE, error: err instanceof Error ? err.message : String(err) })
    }
  }

  log('info', 'agent_start', {
    chainId: CHAIN_ID,
    targetToken: TARGET_TOKEN,
    quoteToken: QUOTE_TOKEN,
    targetAllocationUsd: TARGET_ALLOCATION_USD,
    highThreshold: HIGH_PRICE_THRESHOLD,
    lowThreshold: LOW_PRICE_THRESHOLD,
    dexRouter: DEX_ROUTER,
    poolAddress: POOL_ADDRESS,
    poolFee: POOL_FEE,
    pollMs: POLL_MS,
    slippageBps: SLIPPAGE_BPS,
  })

  const me = await whoami()
  const wallet = me.evmWalletAddress as Address
  if (!wallet) throw new Error('No EVM wallet address -- run `waap-cli signup` first')

  log('info', 'agent_start', { wallet })

  while (true) {
    try {
      await tick(wallet)
    } catch (err) {
      log('error', 'tick_error', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

main().catch((err) => {
  log('error', 'agent_start', { fatal: true, error: String(err) })
  process.exit(1)
})
