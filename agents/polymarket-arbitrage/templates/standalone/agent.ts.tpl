import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'
import { createHmac } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = {{chainId}}
const API_URL = process.env.POLYMARKET_API_URL ?? 'https://clob.polymarket.com'
const GAMMA_API_URL = 'https://gamma-api.polymarket.com'
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 30_000)
const MAX_ORDER_USD = Number(process.env.AGENT_MAX_ORDER_USD)
const MIN_SPREAD_BPS = Number(process.env.MIN_SPREAD_BPS ?? 50)
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)

// Polymarket CLOB credentials
const POLY_API_KEY = process.env.POLY_API_KEY
const POLY_API_SECRET = process.env.POLY_API_SECRET
const POLY_PASSPHRASE = process.env.POLY_PASSPHRASE

// Polymarket CTF Exchange on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

// Polymarket fee structure: ~1% maker + ~1% taker per side, ~2% round-trip per leg
const FEE_BPS_PER_LEG = 200

// Watchdog integration — writes a PID file on startup so external supervisors
// (systemd Type=simple + a tailer, or a bash watchdog) can detect liveness.
// Defaults to enabled to match the aex Hetzner deployment pattern. Set
// WRITE_PID_FILE=false to opt out (e.g. local dev where stale .pid files
// during crashes are annoying).
const WRITE_PID_FILE = (process.env.WRITE_PID_FILE ?? 'true').toLowerCase() !== 'false'
const PID_FILE = process.env.PID_FILE ?? path.join(process.cwd(), 'agent.pid')

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

if (!Number.isFinite(MAX_ORDER_USD) || MAX_ORDER_USD <= 0) {
  console.error(`${TAG} AGENT_MAX_ORDER_USD must be a positive number`)
  process.exit(1)
}

if (!POLY_API_KEY || !POLY_API_SECRET || !POLY_PASSPHRASE) {
  console.error(`${TAG} Missing Polymarket credentials. Set POLY_API_KEY, POLY_API_SECRET, and POLY_PASSPHRASE.`)
  process.exit(1)
}

if (MIN_SPREAD_BPS < 0) {
  console.error(`${TAG} MIN_SPREAD_BPS must be non-negative`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Structured logging -- JSON lines to stdout + file for AEX dashboard ingest
// ---------------------------------------------------------------------------

function ensureLogDir(): void {
  const dir = path.dirname(LOG_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function log(level: string, event: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), agent: AGENT_ID, level, event, ...data }
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

interface GammaToken {
  token_id: string
  outcome: string
  price?: number
}

interface GammaMarket {
  id: string
  question: string
  condition_id: string
  tokens: GammaToken[]
  outcomePrices?: string
  active: boolean
  closed: boolean
}

interface GammaEvent {
  id: string
  title: string
  slug: string
  markets: GammaMarket[]
}

interface OrderMessage {
  salt: number
  maker: string
  signer: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  expiration: string
  nonce: string
  feeRateBps: string
  side: number
  signatureType: number
}

interface ArbOpportunity {
  type: 'complementary' | 'related'
  eventTitle: string
  marketA: GammaMarket
  marketB?: GammaMarket
  tokenA: GammaToken
  tokenB: GammaToken
  priceA: number
  priceB: number
  spreadBps: number
  expectedProfitBps: number
  action: 'buy_both' | 'sell_both'
}

interface OpenPosition {
  id: string
  opportunity: ArbOpportunity
  legAOrderId?: string
  legBOrderId?: string
  status: 'pending' | 'partial' | 'filled' | 'failed'
  openedAt: string
  amountUsd: number
}

// ---------------------------------------------------------------------------
// Position tracker
// ---------------------------------------------------------------------------

const openPositions: Map<string, OpenPosition> = new Map()

function trackPosition(opp: ArbOpportunity, amountUsd: number): OpenPosition {
  const id = `arb-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const position: OpenPosition = {
    id,
    opportunity: opp,
    status: 'pending',
    openedAt: new Date().toISOString(),
    amountUsd,
  }
  openPositions.set(id, position)
  return position
}

// ---------------------------------------------------------------------------
// WaaP CLI helpers
// ---------------------------------------------------------------------------

// waap-cli --json emits newline-delimited JSON (e.g. event:submitted,
// event:result, then a pretty-printed final form). Pick the result line.
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

async function signOrder(typedData: unknown): Promise<string> {
  const { stdout } = await execa('waap-cli', [
    'sign-typed-data',
    '--data',
    JSON.stringify(typedData),
    '--json',
  ])
  const parsed = parseWaapJson<{ signature: string }>(stdout)
  return parsed.signature
}

// ---------------------------------------------------------------------------
// Polymarket Gamma API -- market and event discovery
// ---------------------------------------------------------------------------

async function getActiveEvents(): Promise<GammaEvent[]> {
  log('info', 'market_scan', { status: 'fetching' })
  const res = await request(
    `${GAMMA_API_URL}/events?active=true&closed=false&limit=50`
  )
  const data = (await res.body.json()) as GammaEvent[]
  log('info', 'market_scan', { status: 'complete', eventCount: data.length })
  return data
}

function parseOutcomePrices(market: GammaMarket): { yesPrice: number; noPrice: number } | null {
  // outcomePrices is a JSON string like "[\"0.55\",\"0.45\"]" where index 0 = YES, 1 = NO
  if (!market.outcomePrices) return null
  try {
    const prices = JSON.parse(market.outcomePrices) as string[]
    if (prices.length < 2) return null
    const yesPrice = parseFloat(prices[0])
    const noPrice = parseFloat(prices[1])
    if (!Number.isFinite(yesPrice) || !Number.isFinite(noPrice)) return null
    return { yesPrice, noPrice }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Arbitrage detection
// ---------------------------------------------------------------------------

/**
 * Complementary market arbitrage: within a single market, check if
 * YES_price + NO_price deviates from 1.00.
 *
 * If sum > 1.0: sell both sides (guaranteed profit = sum - 1.0 - fees)
 * If sum < 1.0: buy both sides (guaranteed profit = 1.0 - sum - fees)
 */
function findComplementaryArbs(events: GammaEvent[]): ArbOpportunity[] {
  const opportunities: ArbOpportunity[] = []

  for (const event of events) {
    for (const market of event.markets ?? []) {
      if (!market.active || market.closed) continue
      if (!market.tokens || market.tokens.length < 2) continue

      const prices = parseOutcomePrices(market)
      if (!prices) continue

      const sum = prices.yesPrice + prices.noPrice
      const deviationBps = Math.abs(sum - 1.0) * 10_000

      // Subtract fees for both legs
      const profitBps = deviationBps - (FEE_BPS_PER_LEG * 2)
      if (profitBps < MIN_SPREAD_BPS) continue

      const yesToken = market.tokens.find((t) => t.outcome === 'Yes')
      const noToken = market.tokens.find((t) => t.outcome === 'No')
      if (!yesToken || !noToken) continue

      opportunities.push({
        type: 'complementary',
        eventTitle: event.title,
        marketA: market,
        tokenA: yesToken,
        tokenB: noToken,
        priceA: prices.yesPrice,
        priceB: prices.noPrice,
        spreadBps: Math.round(deviationBps),
        expectedProfitBps: Math.round(profitBps),
        action: sum > 1.0 ? 'sell_both' : 'buy_both',
      })
    }
  }

  return opportunities.sort((a, b) => b.expectedProfitBps - a.expectedProfitBps)
}

/**
 * Related market arbitrage: within an event that has multiple markets,
 * find logically related markets with inconsistent implied probabilities.
 *
 * Example: Event "2024 Election" has markets "Candidate X wins" at 60%
 * and "Candidate X loses" at 50%. Sum of complementary outcomes across
 * markets deviates from 1.0.
 *
 * We look for market pairs within the same event where the sum of one
 * market's YES and another's YES (that represent opposing outcomes)
 * deviates from 1.0.
 */
function findRelatedMarketArbs(events: GammaEvent[]): ArbOpportunity[] {
  const opportunities: ArbOpportunity[] = []

  for (const event of events) {
    const markets = (event.markets ?? []).filter(
      (m) => m.active && !m.closed && m.tokens?.length >= 2
    )
    if (markets.length < 2) continue

    // Compare all pairs of markets within the same event
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const mA = markets[i]
        const mB = markets[j]

        const pricesA = parseOutcomePrices(mA)
        const pricesB = parseOutcomePrices(mB)
        if (!pricesA || !pricesB) continue

        // Check if markets represent complementary outcomes.
        // Heuristic: if market A's YES + market B's YES is close to 1.0,
        // they may be complements. If it deviates significantly, there is arb.
        // Also check A.YES + B.NO vs 1.0 for correlated markets.
        const pairs: Array<{
          pA: number; pB: number;
          tokenA: GammaToken | undefined; tokenB: GammaToken | undefined;
          label: string;
        }> = [
          {
            pA: pricesA.yesPrice,
            pB: pricesB.yesPrice,
            tokenA: mA.tokens.find((t) => t.outcome === 'Yes'),
            tokenB: mB.tokens.find((t) => t.outcome === 'Yes'),
            label: 'YES+YES',
          },
          {
            pA: pricesA.yesPrice,
            pB: pricesB.noPrice,
            tokenA: mA.tokens.find((t) => t.outcome === 'Yes'),
            tokenB: mB.tokens.find((t) => t.outcome === 'No'),
            label: 'YES+NO',
          },
        ]

        for (const pair of pairs) {
          if (!pair.tokenA || !pair.tokenB) continue

          const sum = pair.pA + pair.pB
          const deviationBps = Math.abs(sum - 1.0) * 10_000

          // Need larger deviation for cross-market arbs since the logical
          // relationship is heuristic, not guaranteed
          const profitBps = deviationBps - (FEE_BPS_PER_LEG * 2)
          if (profitBps < MIN_SPREAD_BPS) continue

          // Only consider pairs that look like complements (sum near 1.0
          // but not exact). Skip pairs that sum to ~2.0 or ~0.0 -- those
          // are likely correlated, not complementary.
          if (sum > 1.5 || sum < 0.5) continue

          opportunities.push({
            type: 'related',
            eventTitle: event.title,
            marketA: mA,
            marketB: mB,
            tokenA: pair.tokenA,
            tokenB: pair.tokenB,
            priceA: pair.pA,
            priceB: pair.pB,
            spreadBps: Math.round(deviationBps),
            expectedProfitBps: Math.round(profitBps),
            action: sum > 1.0 ? 'sell_both' : 'buy_both',
          })
        }
      }
    }
  }

  return opportunities.sort((a, b) => b.expectedProfitBps - a.expectedProfitBps)
}

// ---------------------------------------------------------------------------
// Polymarket CLOB auth -- HMAC signature generation
// ---------------------------------------------------------------------------

function generatePmApiSign({
  apiSecret,
  timestamp,
  method,
  requestPath,
  body,
}: {
  apiSecret: string
  timestamp: string
  method: string
  requestPath: string
  body: string
}): string {
  const normalizedSecret = apiSecret
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '')

  const secretKey = Buffer.from(normalizedSecret, 'base64')
  const message = `${timestamp}${String(method).toUpperCase()}${requestPath}${body ?? ''}`

  const digestBase64 = createHmac('sha256', secretKey)
    .update(message, 'utf8')
    .digest('base64')

  return digestBase64.replace(/\+/g, '-').replace(/\//g, '_')
}

// ---------------------------------------------------------------------------
// EIP-712 order construction
// ---------------------------------------------------------------------------

function buildOrderTypedData(
  maker: string,
  tokenId: string,
  side: 'BUY' | 'SELL',
  amountUsd: number,
  price: number,
): { typedData: Record<string, unknown>; orderMessage: OrderMessage } {
  // For a BUY at price p: you pay p * amount USDC to receive 1 * amount shares.
  // For a SELL at price p: you give 1 * amount shares to receive p * amount USDC.
  // makerAmount = what you give, takerAmount = what you get.
  const shares = Math.floor(amountUsd / price)
  const usdcMicro = String(Math.floor(amountUsd * 1e6))
  const sharesMicro = String(Math.floor(shares * 1e6))

  const orderMessage: OrderMessage = {
    salt: Math.floor(Math.random() * 1_000_000_000),
    maker,
    signer: maker,
    tokenId,
    makerAmount: side === 'BUY' ? usdcMicro : sharesMicro,
    takerAmount: side === 'BUY' ? sharesMicro : usdcMicro,
    expiration: '0',
    nonce: '0',
    feeRateBps: '0',
    side: side === 'BUY' ? 0 : 1,
    signatureType: 0,
  }

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'makerAmount', type: 'uint256' },
        { name: 'takerAmount', type: 'uint256' },
        { name: 'expiration', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'feeRateBps', type: 'uint256' },
        { name: 'side', type: 'uint8' },
        { name: 'signatureType', type: 'uint8' },
      ],
    },
    domain: {
      name: 'Polymarket CTF Exchange',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: CTF_EXCHANGE,
    },
    primaryType: 'Order',
    message: orderMessage,
  }

  return { typedData, orderMessage }
}

// ---------------------------------------------------------------------------
// Order submission
// ---------------------------------------------------------------------------

async function submitOrder(
  orderMessage: OrderMessage,
  signature: string,
  owner: string,
): Promise<Record<string, unknown>> {
  const requestPath = '/order'
  const method = 'POST'
  const timestamp = String(Date.now())

  const requestBody = JSON.stringify({
    order: orderMessage,
    owner,
    signature,
  })

  const pmApiSign = generatePmApiSign({
    apiSecret: POLY_API_SECRET!,
    timestamp,
    method,
    requestPath,
    body: requestBody,
  })

  const res = await request(`${API_URL}${requestPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'PM-API-KEY': POLY_API_KEY!,
      'PM-API-PASSPHRASE': POLY_PASSPHRASE!,
      'PM-API-TIMESTAMP': timestamp,
      'PM-API-SIGN': pmApiSign,
    },
    body: requestBody,
  })

  return (await res.body.json()) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Execute arbitrage -- place both legs
// ---------------------------------------------------------------------------

async function executeArbitrage(
  opp: ArbOpportunity,
  address: string,
): Promise<void> {
  const amountPerLeg = Math.min(MAX_ORDER_USD, 5)
  const position = trackPosition(opp, amountPerLeg)

  log('info', 'arb_opportunity', {
    positionId: position.id,
    type: opp.type,
    event: opp.eventTitle,
    marketA: opp.marketA.question,
    marketB: opp.marketB?.question ?? opp.marketA.question,
    priceA: opp.priceA,
    priceB: opp.priceB,
    spreadBps: opp.spreadBps,
    expectedProfitBps: opp.expectedProfitBps,
    action: opp.action,
    amountPerLeg,
  })

  const sideA: 'BUY' | 'SELL' = opp.action === 'buy_both' ? 'BUY' : 'SELL'
  const sideB: 'BUY' | 'SELL' = opp.action === 'buy_both' ? 'BUY' : 'SELL'

  // Leg A: sign and submit
  try {
    const { typedData: tdA, orderMessage: omA } = buildOrderTypedData(
      address,
      opp.tokenA.token_id,
      sideA,
      amountPerLeg,
      opp.priceA,
    )

    log('info', 'order_placed', {
      positionId: position.id,
      leg: 'A',
      status: 'signing',
      tokenId: opp.tokenA.token_id,
      side: sideA,
      price: opp.priceA,
    })

    const sigA = await signOrder(tdA)
    const resultA = await submitOrder(omA, sigA, address)
    position.legAOrderId = (resultA as { orderID?: string }).orderID

    log('info', 'order_placed', {
      positionId: position.id,
      leg: 'A',
      status: 'submitted',
      response: resultA,
    })
  } catch (err) {
    position.status = 'failed'
    log('error', 'order_failed', {
      positionId: position.id,
      leg: 'A',
      error: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Leg B: sign and submit immediately after leg A to minimize execution risk
  try {
    const { typedData: tdB, orderMessage: omB } = buildOrderTypedData(
      address,
      opp.tokenB.token_id,
      sideB,
      amountPerLeg,
      opp.priceB,
    )

    log('info', 'order_placed', {
      positionId: position.id,
      leg: 'B',
      status: 'signing',
      tokenId: opp.tokenB.token_id,
      side: sideB,
      price: opp.priceB,
    })

    const sigB = await signOrder(tdB)
    const resultB = await submitOrder(omB, sigB, address)
    position.legBOrderId = (resultB as { orderID?: string }).orderID

    log('info', 'order_placed', {
      positionId: position.id,
      leg: 'B',
      status: 'submitted',
      response: resultB,
    })
  } catch (err) {
    position.status = 'partial'
    log('error', 'order_failed', {
      positionId: position.id,
      leg: 'B',
      error: err instanceof Error ? err.message : String(err),
      warning: 'Leg A was submitted but leg B failed. Manual intervention may be needed.',
    })
    return
  }

  position.status = 'filled'
  log('info', 'arb_complete', {
    positionId: position.id,
    type: opp.type,
    event: opp.eventTitle,
    spreadBps: opp.spreadBps,
    expectedProfitBps: opp.expectedProfitBps,
    amountPerLeg,
  })
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

async function tick(address: string): Promise<void> {
  const events = await getActiveEvents()

  if (events.length === 0) {
    log('info', 'market_scan', { status: 'no_events' })
    return
  }

  log('info', 'market_scan', {
    status: 'scanning',
    eventCount: events.length,
    totalMarkets: events.reduce((sum, e) => sum + (e.markets?.length ?? 0), 0),
  })

  // Find all arbitrage opportunities
  const complementaryArbs = findComplementaryArbs(events)
  const relatedArbs = findRelatedMarketArbs(events)
  const allArbs = [...complementaryArbs, ...relatedArbs].sort(
    (a, b) => b.expectedProfitBps - a.expectedProfitBps,
  )

  log('info', 'market_scan', {
    status: 'scan_complete',
    complementaryCount: complementaryArbs.length,
    relatedCount: relatedArbs.length,
    totalOpportunities: allArbs.length,
    minSpreadBps: MIN_SPREAD_BPS,
  })

  if (allArbs.length === 0) {
    log('info', 'market_scan', { status: 'no_arb_opportunities' })
    return
  }

  // Log all found opportunities
  for (const opp of allArbs) {
    log('info', 'arb_opportunity', {
      type: opp.type,
      event: opp.eventTitle,
      marketA: opp.marketA.question,
      marketB: opp.marketB?.question,
      spreadBps: opp.spreadBps,
      expectedProfitBps: opp.expectedProfitBps,
      action: opp.action,
    })
  }

  // Execute the best opportunity
  const best = allArbs[0]
  log('info', 'arb_opportunity', {
    status: 'executing_best',
    type: best.type,
    event: best.eventTitle,
    spreadBps: best.spreadBps,
    expectedProfitBps: best.expectedProfitBps,
  })

  await executeArbitrage(best, address)

  // Log open position summary
  const positions = Array.from(openPositions.values())
  log('info', 'balance_snapshot', {
    wallet: address,
    openPositions: positions.length,
    pendingCount: positions.filter((p) => p.status === 'pending').length,
    filledCount: positions.filter((p) => p.status === 'filled').length,
    partialCount: positions.filter((p) => p.status === 'partial').length,
    failedCount: positions.filter((p) => p.status === 'failed').length,
  })
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
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
    pollMs: POLL_MS,
    maxOrderUsd: MAX_ORDER_USD,
    minSpreadBps: MIN_SPREAD_BPS,
    feeBpsPerLeg: FEE_BPS_PER_LEG,
  })

  const me = await whoami()
  const address = me.evmWalletAddress
  if (!address) throw new Error('no EVM wallet address -- run `waap-cli signup` first')

  log('info', 'agent_start', { wallet: address })
  log('info', 'balance_snapshot', { wallet: address, note: 'initial' })

  while (true) {
    try {
      await tick(address)
    } catch (err) {
      log('error', 'order_failed', {
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
