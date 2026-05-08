import 'dotenv/config'
import { execa } from 'execa'

const TAG = '[{{projectName}}]'

interface WhoamiResult {
  evmWalletAddress?: string
  suiWalletAddress?: string
  solanaWalletAddress?: string
  email?: string
}

interface SignResult {
  signature: string
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

async function signMessage(hex: string): Promise<SignResult> {
  const { stdout } = await execa('waap-cli', [
    'sign-message',
    '--message',
    hex,
    '--json',
  ])
  return parseWaapJson<SignResult>(stdout)
}

async function main(): Promise<void> {
  console.log(`${TAG} booting up`)

  const me = await whoami()
  const address = me.evmWalletAddress ?? me.suiWalletAddress ?? me.solanaWalletAddress
  if (!address) throw new Error('no wallet address — run `waap-cli signup` first')
  console.log(`${TAG} wallet: ${address}`)

  // Hex for "hello from {{projectName}}"
  const message = Buffer.from('hello from {{projectName}}', 'utf8').toString('hex')
  const sig = await signMessage(`0x${message}`)
  console.log(`${TAG} signed: ${sig.signature.slice(0, 20)}...`)
}

main().catch((err) => {
  console.error(`${TAG} fatal:`, err instanceof Error ? err.message : err)
  process.exit(1)
})
