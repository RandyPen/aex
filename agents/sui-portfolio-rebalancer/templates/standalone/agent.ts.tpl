import 'dotenv/config'
import { execa } from 'execa'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk'
import { AggregatorClient } from '@cetusprotocol/aggregator-sdk'
import BN from 'bn.js'
import fs from 'node:fs'
import path from 'node:path'

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const NETWORK = (process.env.NETWORK ?? 'mainnet') as 'mainnet' | 'testnet'
const SUI_RPC = process.env.SUI_RPC ?? getFullnodeUrl(NETWORK)

const TARGET_TOKEN_TYPE = process.env.TARGET_TOKEN_TYPE
const QUOTE_TOKEN_TYPE = process.env.QUOTE_TOKEN_TYPE
const TARGET_ALLOCATION_USD = Number(process.env.TARGET_ALLOCATION_USD)
const HIGH_PRICE_THRESHOLD = Number(process.env.HIGH_PRICE_THRESHOLD)
const LOW_PRICE_THRESHOLD = Number(process.env.LOW_PRICE_THRESHOLD)
const CETUS_POOL_ID = process.env.CETUS_POOL_ID

const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000)
const SLIPPAGE_BPS = Number(process.env.SLIPPAGE_BPS ?? 50)
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)

// Cetus aggregator endpoint for swap routing
const CETUS_AGGREGATOR_URL = process.env.CETUS_AGGREGATOR_URL ?? 'https://api-sui.cetus.zone/router_v2'

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function validateConfig(): void {
  const missing: string[] = []
  if (!TARGET_TOKEN_TYPE) missing.push('TARGET_TOKEN_TYPE')
  if (!QUOTE_TOKEN_TYPE) missing.push('QUOTE_TOKEN_TYPE')
  if (!CETUS_POOL_ID) missing.push('CETUS_POOL_ID')
  if (!Number.isFinite(TARGET_ALLOCATION_USD) || TARGET_ALLOCATION_USD <= 0) missing.push('TARGET_ALLOCATION_USD')
  if (!Number.isFinite(HIGH_PRICE_THRESHOLD) || HIGH_PRICE_THRESHOLD <= 0) missing.push('HIGH_PRICE_THRESHOLD')
  if (!Number.isFinite(LOW_PRICE_THRESHOLD) || LOW_PRICE_THRESHOLD <= 0) missing.push('LOW_PRICE_THRESHOLD')

  if (missing.length > 0) {
    console.error(`${TAG} Missing or invalid env vars: ${missing.join(', ')}`)
    process.exit(1)
  }
  if (LOW_PRICE_THRESHOLD >= HIGH_PRICE_THRESHOLD) {
    console.error(`${TAG} LOW_PRICE_THRESHOLD must be less than HIGH_PRICE_THRESHOLD`)
    process.exit(1)
  }
}

// -----------------------------------------------------------------------------
// Structured logging -- JSON lines to stdout + file
// -----------------------------------------------------------------------------

function ensureLogDir(): void {
  const dir = path.dirname(LOG_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

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
// WaaP CLI helpers
// -----------------------------------------------------------------------------

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

async function whoami(): Promise<string> {
  const override = process.env.WAAP_AGENT_ADDRESS?.trim()
  if (override) return override

  const { stdout } = await execa('waap-cli', ['whoami', '--json'])
  const parsed = parseWaapJson<{ suiWalletAddress?: string }>(stdout)
  if (!parsed.suiWalletAddress) {
    throw new Error('no Sui wallet address -- run `waap-cli signup` first or set WAAP_AGENT_ADDRESS')
  }
  return parsed.suiWalletAddress
}

interface WaapSendTxResult {
  event?: string
  txHash?: string
  digest?: string
}

async function signAndSendTx(b64TxBytes: string): Promise<string | null> {
  const { stdout } = await execa(
    'waap-cli',
    ['send-tx', '--tx-bytes', b64TxBytes, '--chain', `sui:${NETWORK}`, '--json'],
    { timeout: 120_000 },
  )
  try {
    const parsed = parseWaapJson<WaapSendTxResult>(stdout)
    return parsed.txHash ?? parsed.digest ?? null
  } catch {
    const m = stdout.match(/(?:Transaction submitted|TxHash|digest):\s*(\S+)/i)
    return m ? m[1] : null
  }
}

// -----------------------------------------------------------------------------
// Sui + Cetus clients
// -----------------------------------------------------------------------------

const sui = new SuiClient({ url: SUI_RPC })
const cetus = initCetusSDK({ network: NETWORK })

// The Cetus aggregator finds the optimal swap route across all Cetus pools,
// splitting across multiple pools when it yields better execution than a
// single direct pool swap.
const aggregator = new AggregatorClient({
  signer: SUI_RPC,         // RPC URL -- signing is handled by waap-cli, not the aggregator
  env: NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
})

// -----------------------------------------------------------------------------
// Pool state and price calculation
// -----------------------------------------------------------------------------

interface PoolState {
  currentSqrtPrice: string
  coinTypeA: string
  coinTypeB: string
  decimalsA: number
  decimalsB: number
}

async function getPoolState(): Promise<PoolState> {
  const pool = await cetus.Pool.getPool(CETUS_POOL_ID!) as Record<string, unknown>
  return {
    currentSqrtPrice: String(pool.current_sqrt_price ?? '0'),
    coinTypeA: String(pool.coinTypeA ?? ''),
    coinTypeB: String(pool.coinTypeB ?? ''),
    decimalsA: Number(pool.decimalsA ?? pool.coinAmountA !== undefined ? 9 : 9),
    decimalsB: Number(pool.decimalsB ?? pool.coinAmountB !== undefined ? 6 : 6),
  }
}

/**
 * Calculate the human-readable price of coinA in terms of coinB from the pool's
 * sqrtPriceX64. Cetus stores sqrt(price) * 2^64 as a u128.
 *
 * price = (sqrtPriceX64 / 2^64)^2 * 10^(decimalsA - decimalsB)
 *
 * If the target token is coinA, this gives the price directly.
 * If the target token is coinB, we invert.
 */
function calculatePrice(pool: PoolState): number {
  const sqrtPriceX64 = BigInt(pool.currentSqrtPrice)
  const Q64 = BigInt(1) << BigInt(64)

  // price = (sqrtPriceX64^2) / (2^128) * 10^(decimalsA - decimalsB)
  const sqrtSquared = sqrtPriceX64 * sqrtPriceX64
  const shifted = Number(sqrtSquared) / Number(Q64 * Q64)
  const decimalAdjustment = Math.pow(10, pool.decimalsA - pool.decimalsB)
  const priceAinB = shifted * decimalAdjustment

  // Determine if target token is coinA or coinB
  const targetIsA = pool.coinTypeA.includes(TARGET_TOKEN_TYPE!.split('::').pop()!)
  return targetIsA ? priceAinB : (priceAinB > 0 ? 1 / priceAinB : 0)
}

// -----------------------------------------------------------------------------
// Balance reads
// -----------------------------------------------------------------------------

async function getTokenBalance(owner: string, coinType: string, decimals: number): Promise<number> {
  const r = await sui.getBalance({ owner, coinType })
  return Number(r.totalBalance) / Math.pow(10, decimals)
}

// Determine decimals for a coin type. SUI = 9, most stablecoins = 6.
function guessDecimals(coinType: string): number {
  const lower = coinType.toLowerCase()
  if (lower.includes('::sui::') || lower === '0x2::sui::sui') return 9
  if (lower.includes('usdc') || lower.includes('usdt')) return 6
  return 9 // default to 9 for unknown Sui tokens
}

// -----------------------------------------------------------------------------
// Swap via Cetus Aggregator -- optimizes across all Cetus pools for best
// execution price instead of routing through a single pool directly.
// -----------------------------------------------------------------------------

async function executeSwap(
  owner: string,
  pool: PoolState,
  direction: 'buy' | 'sell',
  amountUsd: number,
  currentPrice: number,
): Promise<string | null> {
  const targetDecimals = guessDecimals(TARGET_TOKEN_TYPE!)
  const quoteDecimals = guessDecimals(QUOTE_TOKEN_TYPE!)

  // Determine input/output tokens and the raw input amount
  let fromCoin: string
  let toCoin: string
  let amountRaw: bigint

  if (direction === 'sell') {
    // Selling target token for quote token
    fromCoin = TARGET_TOKEN_TYPE!
    toCoin = QUOTE_TOKEN_TYPE!
    const tokenAmount = amountUsd / currentPrice
    amountRaw = BigInt(Math.floor(tokenAmount * Math.pow(10, targetDecimals)))
  } else {
    // Buying target token with quote token
    fromCoin = QUOTE_TOKEN_TYPE!
    toCoin = TARGET_TOKEN_TYPE!
    amountRaw = BigInt(Math.floor(amountUsd * Math.pow(10, quoteDecimals)))
  }

  const slippagePct = SLIPPAGE_BPS / 100 // e.g. 50 bps -> 0.5

  log('info', 'swap_building_aggregator', {
    direction,
    fromCoin,
    toCoin,
    amountRaw: amountRaw.toString(),
    slippagePct,
  })

  // Find the best swap route via the Cetus aggregator. The aggregator searches
  // across all available Cetus pools and may split the order across multiple
  // pools for better execution than a single direct swap.
  const routeResult = await aggregator.findRouters({
    from: fromCoin,
    target: toCoin,
    amount: new BN(amountRaw.toString()),
    byAmountIn: true,
  })

  if (!routeResult || !routeResult.routes || routeResult.routes.length === 0) {
    log('error', 'no_aggregator_route', { fromCoin, toCoin, amountRaw: amountRaw.toString() })
    throw new Error(`Cetus aggregator found no route from ${fromCoin} to ${toCoin}`)
  }

  log('info', 'aggregator_route_found', {
    routeCount: routeResult.routes.length,
    estimatedOut: routeResult.routes[0]?.amountOut?.toString() ?? 'unknown',
  })

  // Build a Transaction from the aggregator's best route
  const tx = new Transaction()
  tx.setSender(owner)

  await aggregator.fastRouterSwap({
    routers: routeResult.routes,
    byAmountIn: true,
    txb: tx,
    slippage: slippagePct,
    isMergeTragetCoin: true,
    refreshAllCoins: true,
  })

  const txBytes = Buffer.from(await tx.build({ client: sui })).toString('base64')
  return signAndSendTx(txBytes)
}

// -----------------------------------------------------------------------------
// Rebalance history
// -----------------------------------------------------------------------------

interface RebalanceRecord {
  timestamp: string
  direction: 'buy' | 'sell'
  price: number
  amountUsd: number
  txHash: string | null
}

const rebalanceHistory: RebalanceRecord[] = []

// -----------------------------------------------------------------------------
// Main tick
// -----------------------------------------------------------------------------

async function tick(owner: string): Promise<void> {
  const pool = await getPoolState()
  const price = calculatePrice(pool)

  log('info', 'price_check', {
    price: price.toFixed(6),
    highThreshold: HIGH_PRICE_THRESHOLD,
    lowThreshold: LOW_PRICE_THRESHOLD,
    sqrtPrice: pool.currentSqrtPrice,
  })

  // Read current balances
  const targetDecimals = guessDecimals(TARGET_TOKEN_TYPE!)
  const quoteDecimals = guessDecimals(QUOTE_TOKEN_TYPE!)
  const targetBalance = await getTokenBalance(owner, TARGET_TOKEN_TYPE!, targetDecimals)
  const quoteBalance = await getTokenBalance(owner, QUOTE_TOKEN_TYPE!, quoteDecimals)
  const targetValueUsd = targetBalance * price

  logEvent('balance_snapshot', {
    targetToken: TARGET_TOKEN_TYPE,
    targetBalance: targetBalance.toFixed(6),
    targetValueUsd: targetValueUsd.toFixed(2),
    quoteToken: QUOTE_TOKEN_TYPE,
    quoteBalance: quoteBalance.toFixed(2),
    price: price.toFixed(6),
  })

  // Check thresholds
  if (price >= HIGH_PRICE_THRESHOLD) {
    // Price is high -- sell target to get back to target allocation
    const excessUsd = targetValueUsd - TARGET_ALLOCATION_USD
    if (excessUsd <= 0) {
      log('info', 'price_high_but_under_target', {
        price: price.toFixed(6),
        targetValueUsd: targetValueUsd.toFixed(2),
        targetAllocation: TARGET_ALLOCATION_USD,
      })
      return
    }

    logEvent('rebalance_triggered', {
      direction: 'sell',
      price: price.toFixed(6),
      excessUsd: excessUsd.toFixed(2),
      targetValueUsd: targetValueUsd.toFixed(2),
      targetAllocation: TARGET_ALLOCATION_USD,
    })

    try {
      const txHash = await executeSwap(owner, pool, 'sell', excessUsd, price)
      const record: RebalanceRecord = {
        timestamp: new Date().toISOString(),
        direction: 'sell',
        price,
        amountUsd: excessUsd,
        txHash,
      }
      rebalanceHistory.push(record)

      logEvent('rebalance_complete', {
        direction: 'sell',
        txHash,
        amountUsd: excessUsd.toFixed(2),
        price: price.toFixed(6),
        totalRebalances: rebalanceHistory.length,
      })
    } catch (err) {
      log('error', 'rebalance_failed', {
        direction: 'sell',
        price: price.toFixed(6),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  } else if (price <= LOW_PRICE_THRESHOLD) {
    // Price is low -- buy target to get up to target allocation
    const deficitUsd = TARGET_ALLOCATION_USD - targetValueUsd
    if (deficitUsd <= 0) {
      log('info', 'price_low_but_over_target', {
        price: price.toFixed(6),
        targetValueUsd: targetValueUsd.toFixed(2),
        targetAllocation: TARGET_ALLOCATION_USD,
      })
      return
    }

    // Do not buy more than we can afford
    const buyAmountUsd = Math.min(deficitUsd, quoteBalance)
    if (buyAmountUsd < 0.01) {
      log('warn', 'insufficient_quote_balance', {
        deficitUsd: deficitUsd.toFixed(2),
        quoteBalance: quoteBalance.toFixed(2),
      })
      return
    }

    logEvent('rebalance_triggered', {
      direction: 'buy',
      price: price.toFixed(6),
      deficitUsd: deficitUsd.toFixed(2),
      buyAmountUsd: buyAmountUsd.toFixed(2),
      targetValueUsd: targetValueUsd.toFixed(2),
      targetAllocation: TARGET_ALLOCATION_USD,
    })

    try {
      const txHash = await executeSwap(owner, pool, 'buy', buyAmountUsd, price)
      const record: RebalanceRecord = {
        timestamp: new Date().toISOString(),
        direction: 'buy',
        price,
        amountUsd: buyAmountUsd,
        txHash,
      }
      rebalanceHistory.push(record)

      logEvent('rebalance_complete', {
        direction: 'buy',
        txHash,
        amountUsd: buyAmountUsd.toFixed(2),
        price: price.toFixed(6),
        totalRebalances: rebalanceHistory.length,
      })
    } catch (err) {
      log('error', 'rebalance_failed', {
        direction: 'buy',
        price: price.toFixed(6),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    log('info', 'price_in_range', {
      price: price.toFixed(6),
      low: LOW_PRICE_THRESHOLD,
      high: HIGH_PRICE_THRESHOLD,
      targetValueUsd: targetValueUsd.toFixed(2),
    })
  }
}

// -----------------------------------------------------------------------------
// Entrypoint
// -----------------------------------------------------------------------------

let stopping = false
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5

async function main(): Promise<void> {
  validateConfig()
  ensureLogDir()

  const owner = await whoami()
  cetus.senderAddress = owner

  logEvent('agent_start', {
    wallet: owner,
    network: NETWORK,
    targetToken: TARGET_TOKEN_TYPE,
    quoteToken: QUOTE_TOKEN_TYPE,
    targetAllocationUsd: TARGET_ALLOCATION_USD,
    highThreshold: HIGH_PRICE_THRESHOLD,
    lowThreshold: LOW_PRICE_THRESHOLD,
    poolId: CETUS_POOL_ID,
    pollMs: POLL_MS,
    slippageBps: SLIPPAGE_BPS,
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
      log('error', 'tick_failed', {
        error: err instanceof Error ? err.message : String(err),
        consecutiveErrors,
      })
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        log('error', 'too_many_consecutive_errors', {
          consecutiveErrors,
          message: 'stopping agent',
        })
        process.exit(1)
      }
    }

    if (stopping) break

    // Chunked sleep so SIGTERM is honored within ~1 second
    const slices = Math.max(1, Math.ceil(POLL_MS / 1000))
    for (let i = 0; i < slices && !stopping; i++) {
      await new Promise((r) => setTimeout(r, Math.min(1000, POLL_MS)))
    }
  }

  log('info', 'agent_stopped', { totalRebalances: rebalanceHistory.length })
}

main().catch((err) => {
  log('error', 'fatal', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
