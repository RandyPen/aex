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

// LLM configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER as 'anthropic' | 'openai'
const LLM_API_KEY = process.env.LLM_API_KEY
const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.7)
const LLM_DELAY_MS = Number(process.env.LLM_DELAY_MS ?? 1000)

// Polymarket CLOB credentials
const POLY_API_KEY = process.env.POLY_API_KEY
const POLY_API_SECRET = process.env.POLY_API_SECRET
const POLY_PASSPHRASE = process.env.POLY_PASSPHRASE

// Polymarket CTF Exchange on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

if (!Number.isFinite(MAX_ORDER_USD) || MAX_ORDER_USD <= 0) {
  console.error(`${TAG} AGENT_MAX_ORDER_USD must be a positive number`)
  process.exit(1)
}

if (!LLM_PROVIDER || !['anthropic', 'openai'].includes(LLM_PROVIDER)) {
  console.error(`${TAG} LLM_PROVIDER must be "anthropic" or "openai"`)
  process.exit(1)
}

if (!LLM_API_KEY) {
  console.error(`${TAG} LLM_API_KEY is required`)
  process.exit(1)
}

if (!POLY_API_KEY || !POLY_API_SECRET || !POLY_PASSPHRASE) {
  console.error(`${TAG} Missing Polymarket credentials. Set POLY_API_KEY, POLY_API_SECRET, and POLY_PASSPHRASE.`)
  process.exit(1)
}

if (CONFIDENCE_THRESHOLD < 0 || CONFIDENCE_THRESHOLD > 1) {
  console.error(`${TAG} CONFIDENCE_THRESHOLD must be between 0 and 1`)
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

interface GammaEvent {
  title: string
  markets: GammaMarket[]
}

interface GammaMarket {
  id: string
  question: string
  description?: string
  tokens: { token_id: string; outcome: string }[]
  outcomePrices?: string
  volume?: string
  liquidity?: string
}

interface LlmAnalysis {
  side: 'YES' | 'NO'
  confidence: number
  reasoning: string
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
// Polymarket Gamma API -- market discovery
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
// LLM analysis
// ---------------------------------------------------------------------------

const LLM_SYSTEM_PROMPT = `You are a prediction market analyst. You will be given a market question from Polymarket along with available context (description, current prices, volume). Your job is to assess the probability that the outcome will be YES or NO.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "side": "YES" or "NO",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of your analysis>"
}

Guidelines:
- confidence represents how strongly you believe in your chosen side
- A confidence of 0.5 means you have no edge; closer to 1.0 means high conviction
- Consider the current market price -- if YES is trading at 0.80, you need confidence above 0.80 to bet YES
- Factor in base rates, current events, and any contextual information provided
- Keep reasoning concise (1-3 sentences)
- If you truly cannot assess the market, return confidence 0.5 with side "YES"`

function buildMarketPrompt(market: GammaMarket): string {
  const parts: string[] = [
    `Market question: ${market.question}`,
  ]

  if (market.description) {
    parts.push(`Description: ${market.description}`)
  }

  if (market.outcomePrices) {
    try {
      const prices = JSON.parse(market.outcomePrices)
      if (Array.isArray(prices) && prices.length >= 2) {
        parts.push(`Current prices -- YES: ${prices[0]}, NO: ${prices[1]}`)
      }
    } catch {
      parts.push(`Raw outcome prices: ${market.outcomePrices}`)
    }
  }

  if (market.volume) {
    parts.push(`Volume: $${market.volume}`)
  }

  if (market.liquidity) {
    parts.push(`Liquidity: $${market.liquidity}`)
  }

  return parts.join('\n')
}

async function callAnthropicApi(prompt: string): Promise<string> {
  const res = await request('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': LLM_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: LLM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = (await res.body.json()) as {
    content?: { type: string; text: string }[]
    error?: { message: string }
  }

  if (data.error) {
    throw new Error(`Anthropic API error: ${data.error.message}`)
  }

  const textBlock = data.content?.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text content in Anthropic response')
  return textBlock.text
}

async function callOpenaiApi(prompt: string): Promise<string> {
  const res = await request('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 512,
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const data = (await res.body.json()) as {
    choices?: { message: { content: string } }[]
    error?: { message: string }
  }

  if (data.error) {
    throw new Error(`OpenAI API error: ${data.error.message}`)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in OpenAI response')
  return content
}

async function analyzeMarket(market: GammaMarket): Promise<LlmAnalysis> {
  const prompt = buildMarketPrompt(market)

  let rawResponse: string
  if (LLM_PROVIDER === 'anthropic') {
    rawResponse = await callAnthropicApi(prompt)
  } else {
    rawResponse = await callOpenaiApi(prompt)
  }

  // Extract JSON from the response (handle potential markdown code blocks)
  let jsonStr = rawResponse.trim()
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  const parsed = JSON.parse(jsonStr) as {
    side?: string
    confidence?: number
    reasoning?: string
  }

  const side = String(parsed.side).toUpperCase()
  if (side !== 'YES' && side !== 'NO') {
    throw new Error(`Invalid side from LLM: ${parsed.side}`)
  }

  const confidence = Number(parsed.confidence)
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence from LLM: ${parsed.confidence}`)
  }

  return {
    side: side as 'YES' | 'NO',
    confidence,
    reasoning: String(parsed.reasoning ?? ''),
  }
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
// Main tick -- scan markets, analyze with LLM, place orders
// ---------------------------------------------------------------------------

async function tick(address: string): Promise<void> {
  const events = await getActiveMarkets()

  if (events.length === 0) {
    log('info', 'market_scan', { status: 'no_markets' })
    return
  }

  // Collect all tradeable markets across events
  const tradeableMarkets: GammaMarket[] = []
  for (const event of events) {
    if (!event.markets) continue
    for (const market of event.markets) {
      if (market.tokens?.length > 0) {
        tradeableMarkets.push(market)
      }
    }
  }

  log('info', 'market_scan', {
    eventsFound: events.length,
    tradeableMarkets: tradeableMarkets.length,
  })

  if (tradeableMarkets.length === 0) {
    log('info', 'market_scan', { status: 'no_tradeable_markets' })
    return
  }

  // Analyze each market with the LLM
  for (const market of tradeableMarkets) {
    try {
      const analysis = await analyzeMarket(market)

      log('info', 'llm_analysis', {
        marketId: market.id,
        question: market.question,
        side: analysis.side,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        provider: LLM_PROVIDER,
        threshold: CONFIDENCE_THRESHOLD,
      })

      // Skip if confidence is below threshold
      if (analysis.confidence < CONFIDENCE_THRESHOLD) {
        log('info', 'llm_analysis', {
          marketId: market.id,
          status: 'skipped',
          reason: `confidence ${analysis.confidence} below threshold ${CONFIDENCE_THRESHOLD}`,
        })
        await delay(LLM_DELAY_MS)
        continue
      }

      // Determine which token to buy based on the LLM's chosen side
      const tokenIndex = analysis.side === 'YES' ? 0 : 1
      const token = market.tokens[tokenIndex]
      if (!token) {
        log('warn', 'llm_analysis', {
          marketId: market.id,
          status: 'skipped',
          reason: `no token at index ${tokenIndex}`,
        })
        await delay(LLM_DELAY_MS)
        continue
      }

      const tokenId = token.token_id
      const orderSide: 'BUY' | 'SELL' = 'BUY'
      const amountUsd = Math.min(MAX_ORDER_USD, 5)

      log('info', 'order_placed', {
        status: 'building',
        market: market.question,
        tokenId,
        side: orderSide,
        llmSide: analysis.side,
        confidence: analysis.confidence,
        amountUsd,
      })

      // Build EIP-712 typed data
      const { typedData, orderMessage } = buildOrderTypedData(
        address,
        tokenId,
        orderSide,
        amountUsd,
      )

      // Sign via WaaP CLI (2PC-MPC -- no raw private key in env)
      const signature = await signOrder(typedData)
      log('info', 'order_placed', { status: 'signed', sigPrefix: signature.slice(0, 20) })

      // Submit to Polymarket CLOB
      try {
        const result = await submitOrder(orderMessage, signature, address)
        log('info', 'order_placed', {
          status: 'submitted',
          market: market.question,
          tokenId,
          llmSide: analysis.side,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          amountUsd,
          response: result,
        })
      } catch (err) {
        log('error', 'order_failed', {
          market: market.question,
          tokenId,
          llmSide: analysis.side,
          confidence: analysis.confidence,
          amountUsd,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    } catch (err) {
      log('error', 'llm_analysis', {
        marketId: market.id,
        question: market.question,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Rate limit between LLM calls
    await delay(LLM_DELAY_MS)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
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
    llmProvider: LLM_PROVIDER,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    llmDelayMs: LLM_DELAY_MS,
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
    await delay(POLL_MS)
  }
}

main().catch((err) => {
  log('error', 'agent_start', { fatal: true, error: String(err) })
  process.exit(1)
})
