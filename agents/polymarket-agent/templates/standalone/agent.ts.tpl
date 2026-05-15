import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'
import { createHmac } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = {{chainId}}
const API_URL = process.env.POLYMARKET_API_URL ?? 'https://clob.polymarket.com'
const GAMMA_API_URL = 'https://gamma-api.polymarket.com'
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 60_000)
const MAX_ORDER_USD = Number(process.env.AGENT_MAX_ORDER_USD)
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)

// Polymarket CLOB credentials
const POLY_API_KEY = process.env.POLY_API_KEY
const POLY_API_SECRET = process.env.POLY_API_SECRET
const POLY_PASSPHRASE = process.env.POLY_PASSPHRASE

// Polymarket CTF Exchange on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

if (!Number.isFinite(MAX_ORDER_USD) || MAX_ORDER_USD <= 0) {
  console.error(`${TAG} AGENT_MAX_ORDER_USD must be a positive number`)
  process.exit(1)
}

if (!POLY_API_KEY || !POLY_API_SECRET || !POLY_PASSPHRASE) {
  console.error(`${TAG} Missing Polymarket credentials. Set POLY_API_KEY, POLY_API_SECRET, and POLY_PASSPHRASE.`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Structured logging — JSON lines to stdout + file for AEX dashboard ingest
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

interface GammaEvent {
  title: string
  markets: GammaMarket[]
}

interface GammaMarket {
  id: string
  question: string
  tokens: { token_id: string; outcome: string }[]
  outcomePrices?: string
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

// ---------------------------------------------------------------------------
// WaaP CLI helpers
// ---------------------------------------------------------------------------

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

async function whoami(): Promise<WhoamiResult> {
  const { stdout } = await execa('waap-cli', ['whoami', '--json'])
  return parseWaapJson<WhoamiResult>(stdout)
}

async function signOrder(typedData: unknown): Promise<string> {
  const { stdout } = await execa('waap-cli', [
    'sign-typed-data',
    '--chain-id',
    String(CHAIN_ID),
    '--data',
    JSON.stringify(typedData),
    '--json',
  ])
  const parsed = parseWaapJson<{ signature: string }>(stdout)
  return parsed.signature
}

// ---------------------------------------------------------------------------
// Polymarket Gamma API — market discovery
// ---------------------------------------------------------------------------

async function getActiveMarkets(): Promise<GammaEvent[]> {
  log('info', 'market_scan', { status: 'fetching' })
  const res = await request(
    `${GAMMA_API_URL}/events?active=true&closed=false&limit=10`
  )
  const data = (await res.body.json()) as GammaEvent[]
  log('info', 'market_scan', { status: 'complete', count: data.length })
  return data
}

// ---------------------------------------------------------------------------
// Polymarket CLOB auth — HMAC signature generation
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
  // Polymarket L2 signature:
  // base64url(HMAC_SHA256(base64url_decode(secret), timestamp + method + path + body))
  const normalizedSecret = apiSecret
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '')

  const secretKey = Buffer.from(normalizedSecret, 'base64')
  const message = `${timestamp}${String(method).toUpperCase()}${requestPath}${body ?? ''}`

  const digestBase64 = createHmac('sha256', secretKey)
    .update(message, 'utf8')
    .digest('base64')

  // Convert to URL-safe base64 (keep "=" padding, matching Polymarket clients)
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
): { typedData: Record<string, unknown>; orderMessage: OrderMessage } {
  const amountMicroUsdc = String(Math.floor(amountUsd * 1e6))

  const orderMessage: OrderMessage = {
    salt: Math.floor(Math.random() * 1_000_000_000),
    maker,
    signer: maker,
    tokenId,
    makerAmount: amountMicroUsdc,
    takerAmount: amountMicroUsdc,
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
// Main tick
// ---------------------------------------------------------------------------

async function tick(address: string): Promise<void> {
  const events = await getActiveMarkets()

  if (events.length === 0) {
    log('info', 'market_scan', { status: 'no_markets' })
    return
  }

  // Log discovered markets
  for (const [i, event] of events.entries()) {
    log('info', 'market_scan', {
      index: i,
      title: event.title,
      marketCount: event.markets?.length ?? 0,
    })
  }

  // Select the first event with tradeable tokens
  const targetEvent = events.find(
    (e) => e.markets?.length > 0 && e.markets[0].tokens?.length > 0,
  )
  if (!targetEvent) {
    log('warn', 'market_scan', { status: 'no_tradeable_markets' })
    return
  }

  const market = targetEvent.markets[0]
  const tokenId = market.tokens[0].token_id
  const side: 'BUY' | 'SELL' = 'BUY'
  const amountUsd = Math.min(MAX_ORDER_USD, 5)

  log('info', 'order_placed', {
    status: 'building',
    market: market.question,
    tokenId,
    side,
    amountUsd,
  })

  // Build EIP-712 typed data
  const { typedData, orderMessage } = buildOrderTypedData(
    address,
    tokenId,
    side,
    amountUsd,
  )

  // Sign via WaaP CLI (2PC-MPC — no raw private key in env)
  const signature = await signOrder(typedData)
  log('info', 'order_placed', { status: 'signed', sigPrefix: signature.slice(0, 20) })

  // Submit to Polymarket CLOB
  try {
    const result = await submitOrder(orderMessage, signature, address)
    log('info', 'order_placed', {
      status: 'submitted',
      market: market.question,
      tokenId,
      side,
      amountUsd,
      response: result,
    })
  } catch (err) {
    log('error', 'order_failed', {
      market: market.question,
      tokenId,
      side,
      amountUsd,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  ensureLogDir()

  log('info', 'agent_start', {
    chainId: CHAIN_ID,
    pollMs: POLL_MS,
    maxOrderUsd: MAX_ORDER_USD,
  })

  const me = await whoami()
  const address = me.evmWalletAddress
  if (!address) throw new Error('no EVM wallet address — run `waap-cli signup` first')

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
