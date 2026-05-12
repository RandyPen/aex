import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'

const TAG = '[{{projectName}}]'
const CHAIN_ID = {{chainId}}
const API_URL = process.env.POLYMARKET_API_URL ?? 'https://clob.polymarket.com'
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 60_000)
const MAX_ORDER_USD = Number(process.env.AGENT_MAX_ORDER_USD)

if (!Number.isFinite(MAX_ORDER_USD) || MAX_ORDER_USD <= 0) {
  console.error(`${TAG} AGENT_MAX_ORDER_USD must be a positive number`)
  process.exit(1)
}

interface WhoamiResult {
  evmWalletAddress?: string
  suiWalletAddress?: string
  email?: string
}

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

async function signOrder(order: unknown): Promise<string> {
  const { stdout } = await execa('waap-cli', [
    'sign-typed-data',
    '--chain-id',
    String(CHAIN_ID),
    '--data',
    JSON.stringify(order),
    '--json',
  ])
  const parsed = parseWaapJson<{ signature: string }>(stdout)
  return parsed.signature
}

async function fetchOpenMarkets(): Promise<unknown[]> {
  const res = await request(`${API_URL}/markets?status=open`)
  const body = (await res.body.json()) as { markets?: unknown[] }
  return body.markets ?? []
}

async function tick(address: string): Promise<void> {
  const markets = await fetchOpenMarkets()
  console.log(`${TAG} ${markets.length} open markets`)
  // TODO: market selection + order construction.
  // This stub only proves the wiring — see the recipe link in README.md
  // for the full agent logic:
  // https://docs.waap.xyz/recipes/waap-cli-polymarket-agent
  if (markets.length > 0 && process.env.AGENT_SIGN_DEMO === '1') {
    const demoOrder = { type: 'demo', market: 'demo', maker: address }
    const sig = await signOrder(demoOrder)
    console.log(`${TAG} demo order signed: ${sig.slice(0, 20)}...`)
  }
}

async function main(): Promise<void> {
  console.log(`${TAG} starting on chain ${CHAIN_ID}`)
  const me = await whoami()
  const address = me.evmWalletAddress
  if (!address) throw new Error('no EVM wallet address — run `waap-cli signup` first')
  console.log(`${TAG} wallet: ${address}`)
  console.log(`${TAG} max order: $${MAX_ORDER_USD}`)

  while (true) {
    try {
      await tick(address)
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
