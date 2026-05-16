import 'dotenv/config'
import { execa } from 'execa'
import * as fs from 'fs'
import * as path from 'path'

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = Number(process.env.DEFAULT_CHAIN_ID ?? {{chainId}})
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 60_000)
const CONFIG_PATH = path.resolve(process.env.PAYMENT_CONFIG_PATH ?? './payments.json')
const HISTORY_PATH = path.resolve(process.env.PAYMENT_HISTORY_PATH ?? './data/payment-history.json')
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)
const DRY_RUN = process.env.AGENT_DRY_RUN === '1'

// ---------------------------------------------------------------------------
// Structured logging -- JSON lines to stdout + file for AEX dashboard ingest
// ---------------------------------------------------------------------------

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function log(level: string, message: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), agent: AGENT_ID, level, message, ...data }
  console.log(JSON.stringify(entry))
  ensureDir(LOG_FILE)
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentConfig {
  recipient: string
  tokenAddress: string       // ERC-20 contract address, or "native" for ETH/native token
  amount: string             // Human-readable amount (e.g. "100.5" for 100.5 USDC)
  decimals: number           // Token decimals (18 for ETH, 6 for USDC, etc.)
  intervalMs: number         // Milliseconds between payments
  label: string              // Human-readable label (e.g. "Monthly salary - Alice")
  chainId?: number           // Optional per-payment chain override
  enabled?: boolean          // Defaults to true; set false to pause
}

interface PaymentRecord {
  label: string
  recipient: string
  tokenAddress: string
  amount: string
  txHash: string | null
  chainId: number
  paidAt: string             // ISO 8601 timestamp
  status: 'sent' | 'failed'
  error?: string
}

interface PaymentHistory {
  payments: PaymentRecord[]
  lastPaidMap: Record<string, string>  // label -> ISO timestamp of last successful payment
}

interface WhoamiResult {
  evmWalletAddress?: string
  suiWalletAddress?: string
  email?: string
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

async function getBalance(address: string, chainId: number): Promise<string> {
  try {
    const { stdout } = await execa('waap-cli', [
      'balance',
      '--chain-id', String(chainId),
      '--address', address,
      '--json',
    ])
    const parsed = parseWaapJson<{ balance?: string }>(stdout)
    return parsed.balance ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// ---------------------------------------------------------------------------
// ERC-20 transfer calldata encoding
// ---------------------------------------------------------------------------

// Encodes transfer(address,uint256) calldata without ethers.js dependency.
// Function selector: 0xa9059cbb
function encodeErc20Transfer(recipient: string, amountWei: bigint): string {
  const selector = 'a9059cbb'
  const addressPadded = recipient.toLowerCase().replace('0x', '').padStart(64, '0')
  const amountHex = amountWei.toString(16).padStart(64, '0')
  return `0x${selector}${addressPadded}${amountHex}`
}

function toWei(amount: string, decimals: number): bigint {
  const parts = amount.split('.')
  const whole = parts[0] ?? '0'
  let fraction = parts[1] ?? ''

  if (fraction.length > decimals) {
    fraction = fraction.slice(0, decimals)
  }
  fraction = fraction.padEnd(decimals, '0')

  return BigInt(whole + fraction)
}

// ---------------------------------------------------------------------------
// Payment history persistence
// ---------------------------------------------------------------------------

function loadHistory(): PaymentHistory {
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')) as PaymentHistory
    } catch {
      log('warn', 'history_corrupt', { path: HISTORY_PATH })
    }
  }
  return { payments: [], lastPaidMap: {} }
}

function saveHistory(history: PaymentHistory): void {
  ensureDir(HISTORY_PATH)
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2))
}

// ---------------------------------------------------------------------------
// Payment config loading
// ---------------------------------------------------------------------------

function loadPaymentConfig(): PaymentConfig[] {
  if (!fs.existsSync(CONFIG_PATH)) {
    log('error', 'config_missing', { path: CONFIG_PATH })
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  const configs: PaymentConfig[] = Array.isArray(raw) ? raw : raw.payments

  if (!configs || configs.length === 0) {
    log('error', 'config_empty', { path: CONFIG_PATH })
    process.exit(1)
  }

  for (const c of configs) {
    if (!c.recipient || !c.amount || !c.intervalMs || !c.label) {
      log('error', 'config_invalid', { label: c.label ?? 'unknown', reason: 'missing required fields' })
      process.exit(1)
    }
    if (c.tokenAddress === undefined) c.tokenAddress = 'native'
    if (c.decimals === undefined) c.decimals = 18
    if (c.enabled === undefined) c.enabled = true
  }

  return configs
}

// ---------------------------------------------------------------------------
// Transaction submission
// ---------------------------------------------------------------------------

async function sendNativePayment(
  recipient: string,
  amount: string,
  decimals: number,
  chainId: number,
): Promise<{ txHash: string }> {
  const amountWei = toWei(amount, decimals)
  const { stdout } = await execa('waap-cli', [
    'send-tx',
    '--chain-id', String(chainId),
    '--to', recipient,
    '--value', amountWei.toString(),
    '--json',
  ])
  return parseWaapJson<{ txHash: string }>(stdout)
}

async function sendErc20Payment(
  tokenAddress: string,
  recipient: string,
  amount: string,
  decimals: number,
  chainId: number,
): Promise<{ txHash: string }> {
  const amountWei = toWei(amount, decimals)
  const calldata = encodeErc20Transfer(recipient, amountWei)
  const { stdout } = await execa('waap-cli', [
    'send-tx',
    '--chain-id', String(chainId),
    '--to', tokenAddress,
    '--data', calldata,
    '--json',
  ])
  return parseWaapJson<{ txHash: string }>(stdout)
}

// ---------------------------------------------------------------------------
// Payment due check
// ---------------------------------------------------------------------------

function isDue(payment: PaymentConfig, history: PaymentHistory): boolean {
  if (payment.enabled === false) return false

  const lastPaidIso = history.lastPaidMap[payment.label]
  if (!lastPaidIso) return true

  const lastPaidMs = new Date(lastPaidIso).getTime()
  return Date.now() >= lastPaidMs + payment.intervalMs
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

async function tick(address: string, configs: PaymentConfig[]): Promise<void> {
  const history = loadHistory()

  for (const payment of configs) {
    if (!isDue(payment, history)) continue

    const chainId = payment.chainId ?? CHAIN_ID
    const isNative = payment.tokenAddress === 'native'

    log('info', 'payment_due', {
      label: payment.label,
      recipient: payment.recipient,
      token: isNative ? 'native' : payment.tokenAddress,
      amount: payment.amount,
      chainId,
    })

    if (DRY_RUN) {
      log('info', 'payment_skipped_dry_run', { label: payment.label })
      continue
    }

    const record: PaymentRecord = {
      label: payment.label,
      recipient: payment.recipient,
      tokenAddress: payment.tokenAddress,
      amount: payment.amount,
      txHash: null,
      chainId,
      paidAt: new Date().toISOString(),
      status: 'sent',
    }

    try {
      let result: { txHash: string }
      if (isNative) {
        result = await sendNativePayment(payment.recipient, payment.amount, payment.decimals, chainId)
      } else {
        result = await sendErc20Payment(payment.tokenAddress, payment.recipient, payment.amount, payment.decimals, chainId)
      }

      record.txHash = result.txHash
      log('info', 'payment_sent', {
        label: payment.label,
        txHash: result.txHash,
        recipient: payment.recipient,
        amount: payment.amount,
        chainId,
      })

      history.lastPaidMap[payment.label] = record.paidAt
    } catch (err) {
      record.status = 'failed'
      record.error = err instanceof Error ? err.message : String(err)
      log('error', 'payment_failed', {
        label: payment.label,
        recipient: payment.recipient,
        amount: payment.amount,
        chainId,
        error: record.error,
      })
    }

    history.payments.push(record)
    saveHistory(history)
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  ensureDir(LOG_FILE)

  log('info', 'agent_start', {
    chainId: CHAIN_ID,
    pollMs: POLL_MS,
    configPath: CONFIG_PATH,
    historyPath: HISTORY_PATH,
    dryRun: DRY_RUN,
  })

  // Load and validate payment config
  const configs = loadPaymentConfig()
  log('info', 'config_loaded', {
    paymentCount: configs.length,
    labels: configs.map((c) => c.label),
  })

  // Resolve wallet
  const me = await whoami()
  const address = me.evmWalletAddress
  if (!address) throw new Error('No EVM wallet address found. Run `waap-cli signup` first.')

  log('info', 'agent_start', { wallet: address })

  // Initial balance snapshot
  const balance = await getBalance(address, CHAIN_ID)
  log('info', 'balance_snapshot', { wallet: address, balance, chainId: CHAIN_ID, note: 'initial' })

  // Main loop
  let tickCount = 0
  while (true) {
    tickCount++
    try {
      await tick(address, configs)
    } catch (err) {
      log('error', 'tick_error', {
        tick: tickCount,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // Periodic balance snapshot every 10 ticks
    if (tickCount % 10 === 0) {
      const bal = await getBalance(address, CHAIN_ID)
      log('info', 'balance_snapshot', { wallet: address, balance: bal, chainId: CHAIN_ID, tick: tickCount })
    }

    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

main().catch((err) => {
  log('error', 'agent_start', { fatal: true, error: String(err) })
  process.exit(1)
})
