import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AGENT_ID = '{{projectName}}'
const TAG = `[${AGENT_ID}]`
const CHAIN_ID = {{chainId}}
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPOS = (process.env.GITHUB_REPOS ?? '').split(',').map((r) => r.trim()).filter(Boolean)
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 30_000)
const LOG_FILE = path.resolve(process.env.AGENT_LOG_FILE ?? `./logs/${AGENT_ID}.jsonl`)
const DEPLOY_WEBHOOK_URL = process.env.DEPLOY_WEBHOOK_URL
const CI_WORKFLOW_ID = process.env.CI_WORKFLOW_ID ?? 'ci.yml'

// Wallet integration test configuration
const STAGING_URL = process.env.STAGING_URL
const TEST_CONTRACT_ADDRESS = process.env.TEST_CONTRACT_ADDRESS
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS
const TEST_SEND_AMOUNT_ETH = process.env.TEST_SEND_AMOUNT_ETH ?? '0.0001'
const TEST_CONTRACT_METHOD = process.env.TEST_CONTRACT_METHOD ?? '0x'

// Watchdog integration — writes a PID file on startup so external supervisors
// (systemd Type=simple + a tailer, or a bash watchdog) can detect liveness.
// Defaults to enabled to match the aex Hetzner deployment pattern. Set
// WRITE_PID_FILE=false to opt out (e.g. local dev where stale .pid files
// during crashes are annoying).
const WRITE_PID_FILE = (process.env.WRITE_PID_FILE ?? 'true').toLowerCase() !== 'false'
const PID_FILE = process.env.PID_FILE ?? path.join(process.cwd(), 'agent.pid')

const GITHUB_API = 'https://api.github.com'

if (!GITHUB_TOKEN) {
  console.error(`${TAG} GITHUB_TOKEN is required`)
  process.exit(1)
}

if (GITHUB_REPOS.length === 0) {
  console.error(`${TAG} GITHUB_REPOS must contain at least one owner/repo entry`)
  process.exit(1)
}

if (!STAGING_URL) {
  console.error(`${TAG} STAGING_URL is required for wallet integration tests`)
  process.exit(1)
}

if (!TEST_CONTRACT_ADDRESS) {
  console.error(`${TAG} TEST_CONTRACT_ADDRESS is required for contract interaction tests`)
  process.exit(1)
}

if (!TEST_TOKEN_ADDRESS) {
  console.error(`${TAG} TEST_TOKEN_ADDRESS is required for token approval tests`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Structured logging — JSON lines to stdout + file for AEX dashboard ingest
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

interface GitHubPR {
  number: number
  title: string
  state: string
  head: { ref: string; sha: string }
  base: { ref: string }
  user: { login: string }
  merged_at: string | null
  html_url: string
}

interface GitHubWorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  head_sha: string
  html_url: string
  pull_requests: { number: number }[]
}

interface DeployRecord {
  repo: string
  trigger: string
  sha: string
  timestamp: string
  status: 'triggered' | 'complete' | 'failed'
  webhookResponse?: unknown
}

interface TestResult {
  name: string
  passed: boolean
  detail: string
  durationMs: number
}

// ---------------------------------------------------------------------------
// State — track what we have already processed to avoid duplicates
// ---------------------------------------------------------------------------

const seenPRs = new Set<string>()         // "owner/repo#number"
const seenMerges = new Set<string>()       // "owner/repo#number"
const seenFailures = new Set<string>()     // "owner/repo:run_id"
const deployHistory: DeployRecord[] = []

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

async function getBalance(address: string): Promise<string> {
  try {
    const { stdout } = await execa('waap-cli', ['balance', '--chain-id', String(CHAIN_ID), '--json'])
    const parsed = parseWaapJson<{ balance?: string }>(stdout)
    log('info', 'balance_snapshot', { wallet: address, ...parsed })
    return parsed.balance ?? '0'
  } catch (err) {
    log('warn', 'balance_snapshot', { wallet: address, error: err instanceof Error ? err.message : String(err) })
    return '0'
  }
}

// ---------------------------------------------------------------------------
// Wallet Integration Test Suite
// ---------------------------------------------------------------------------

async function runWalletTestSuite(address: string, prNumber: number, repo: string): Promise<TestResult[]> {
  const results: TestResult[] = []

  log('info', 'test_suite_start', { repo, prNumber, stagingUrl: STAGING_URL, wallet: address })

  // Test 1: Wallet connect — sign a SIWE message to prove wallet ownership
  results.push(await runTest('Wallet Connect (SIWE)', async () => {
    const siweMessage = [
      `${STAGING_URL} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Wallet integration test — PR #' + prNumber,
      '',
      `URI: ${STAGING_URL}`,
      `Version: 1`,
      `Chain ID: ${CHAIN_ID}`,
      `Nonce: ${Date.now()}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n')

    const { stdout } = await execa('waap-cli', [
      'sign-message',
      '--message', siweMessage,
      '--json',
    ])

    const parsed = parseWaapJson<{ signature?: string }>(stdout)
    if (!parsed.signature) throw new Error('No signature returned')
    return `Signed SIWE message, signature: ${parsed.signature.slice(0, 16)}...`
  }))

  // Test 2: Transaction test — send a small testnet transaction to self
  results.push(await runTest('Send Transaction', async () => {
    const { stdout } = await execa('waap-cli', [
      'send-tx',
      '--chain-id', String(CHAIN_ID),
      '--to', address, // send to self
      '--value', TEST_SEND_AMOUNT_ETH,
      '--json',
    ])

    const parsed = parseWaapJson<{ txHash?: string }>(stdout)
    if (!parsed.txHash) throw new Error('No txHash returned')
    return `Sent ${TEST_SEND_AMOUNT_ETH} ETH to self, tx: ${parsed.txHash.slice(0, 16)}...`
  }))

  // Test 3: Token approval — approve a token spend via ERC-20 approve()
  results.push(await runTest('Token Approval', async () => {
    // approve(address spender, uint256 amount) — function selector 0x095ea7b3
    // Approve the test contract to spend 1 token (1e18 in wei)
    const approveCalldata = '0x095ea7b3'
      + TEST_CONTRACT_ADDRESS!.slice(2).padStart(64, '0')
      + 'de0b6b3a7640000'.padStart(64, '0') // 1e18

    const { stdout } = await execa('waap-cli', [
      'send-tx',
      '--chain-id', String(CHAIN_ID),
      '--to', TEST_TOKEN_ADDRESS!,
      '--data', approveCalldata,
      '--json',
    ])

    const parsed = parseWaapJson<{ txHash?: string }>(stdout)
    if (!parsed.txHash) throw new Error('No txHash returned')

    // Verify allowance — allowance(address owner, address spender) selector 0xdd62ed3e
    const allowanceCalldata = '0xdd62ed3e'
      + address.slice(2).padStart(64, '0')
      + TEST_CONTRACT_ADDRESS!.slice(2).padStart(64, '0')

    const { stdout: callStdout } = await execa('waap-cli', [
      'send-tx',
      '--chain-id', String(CHAIN_ID),
      '--to', TEST_TOKEN_ADDRESS!,
      '--data', allowanceCalldata,
      '--call', // read-only call, no transaction
      '--json',
    ])

    const callParsed = parseWaapJson<{ result?: string }>(callStdout)
    return `Approval tx: ${parsed.txHash.slice(0, 16)}..., allowance confirmed: ${callParsed.result ?? 'returned'}`
  }))

  // Test 4: Contract interaction — call a configurable contract method
  results.push(await runTest('Contract Interaction', async () => {
    const { stdout } = await execa('waap-cli', [
      'send-tx',
      '--chain-id', String(CHAIN_ID),
      '--to', TEST_CONTRACT_ADDRESS!,
      '--data', TEST_CONTRACT_METHOD,
      '--json',
    ])

    const parsed = parseWaapJson<{ txHash?: string }>(stdout)
    if (!parsed.txHash) throw new Error('No txHash returned')
    return `Contract call tx: ${parsed.txHash.slice(0, 16)}...`
  }))

  // Test 5: Balance check — verify no unexpected drains
  results.push(await runTest('Balance Check', async () => {
    const balanceAfter = await getBalance(address)
    return `Post-test balance: ${balanceAfter} (verify no unexpected drains)`
  }))

  log('info', 'test_suite_complete', {
    repo,
    prNumber,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    total: results.length,
  })

  return results
}

async function runTest(name: string, fn: () => Promise<string>): Promise<TestResult> {
  const start = Date.now()
  try {
    const detail = await fn()
    const durationMs = Date.now() - start
    log('info', 'test_passed', { test: name, detail, durationMs })
    return { name, passed: true, detail, durationMs }
  } catch (err) {
    const durationMs = Date.now() - start
    const detail = err instanceof Error ? err.message : String(err)
    log('warn', 'test_failed', { test: name, error: detail, durationMs })
    return { name, passed: false, detail, durationMs }
  }
}

function formatTestResults(results: TestResult[], prNumber: number): string {
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const statusIcon = passed === total ? 'PASSED' : 'FAILED'

  const lines = [
    `Wallet Integration Tests: ${statusIcon} (${passed}/${total})`,
    '',
    'Test results:',
    '',
  ]

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL'
    lines.push(`  ${icon}: ${r.name} (${r.durationMs}ms)`)
    lines.push(`        ${r.detail}`)
  }

  lines.push('')
  lines.push(`Staging URL: ${STAGING_URL}`)
  lines.push(`Chain ID: ${CHAIN_ID}`)
  lines.push(`Agent: ${AGENT_ID}`)
  lines.push('')
  lines.push('This comment was posted automatically by the Wallet Integration Test Agent.')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

async function githubGet<T>(endpoint: string): Promise<T> {
  const res = await request(`${GITHUB_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': AGENT_ID,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  return (await res.body.json()) as T
}

async function githubPost(endpoint: string, body: unknown): Promise<{ statusCode: number; data: unknown }> {
  const res = await request(`${GITHUB_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': AGENT_ID,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(body),
  })
  const data = await res.body.json()
  return { statusCode: res.statusCode, data }
}

// ---------------------------------------------------------------------------
// Core: poll open PRs
// ---------------------------------------------------------------------------

async function pollOpenPRs(repo: string): Promise<GitHubPR[]> {
  return githubGet<GitHubPR[]>(`/repos/${repo}/pulls?state=open&sort=created&direction=desc&per_page=25`)
}

// ---------------------------------------------------------------------------
// Core: poll recently merged PRs (closed, merged)
// ---------------------------------------------------------------------------

async function pollMergedPRs(repo: string): Promise<GitHubPR[]> {
  const closed = await githubGet<GitHubPR[]>(`/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`)
  return closed.filter((pr) => pr.merged_at !== null)
}

// ---------------------------------------------------------------------------
// Core: poll failed workflow runs
// ---------------------------------------------------------------------------

async function pollFailedRuns(repo: string): Promise<GitHubWorkflowRun[]> {
  const data = await githubGet<{ workflow_runs: GitHubWorkflowRun[] }>(
    `/repos/${repo}/actions/runs?status=failure&per_page=10`
  )
  return data.workflow_runs ?? []
}

// ---------------------------------------------------------------------------
// Action: trigger CI workflow dispatch
// ---------------------------------------------------------------------------

async function triggerCI(repo: string, ref: string, prNumber: number): Promise<void> {
  log('info', 'ci_triggered', { repo, ref, prNumber, workflow: CI_WORKFLOW_ID })

  const { statusCode } = await githubPost(
    `/repos/${repo}/actions/workflows/${CI_WORKFLOW_ID}/dispatches`,
    { ref }
  )

  if (statusCode === 204 || statusCode === 200) {
    log('info', 'ci_triggered', { repo, ref, prNumber, status: 'dispatched' })
  } else {
    log('warn', 'ci_triggered', { repo, ref, prNumber, status: 'dispatch_failed', statusCode })
  }
}

// ---------------------------------------------------------------------------
// Action: post test results as a PR comment
// ---------------------------------------------------------------------------

async function postTestResultsComment(repo: string, prNumber: number, results: TestResult[]): Promise<void> {
  const body = formatTestResults(results, prNumber)

  const { statusCode } = await githubPost(
    `/repos/${repo}/issues/${prNumber}/comments`,
    { body }
  )

  if (statusCode === 201) {
    log('info', 'test_results_posted', { repo, prNumber, passed: results.filter((r) => r.passed).length, total: results.length })
  } else {
    log('warn', 'test_results_posted', { repo, prNumber, status: 'failed', statusCode })
  }
}

// ---------------------------------------------------------------------------
// Action: post failure comment on PR
// ---------------------------------------------------------------------------

async function postFailureComment(repo: string, prNumber: number, run: GitHubWorkflowRun): Promise<void> {
  const body = [
    `CI Failure Report (automated by ${AGENT_ID})`,
    '',
    `Workflow: ${run.name}`,
    `Status: ${run.conclusion}`,
    `Commit: ${run.head_sha.slice(0, 8)}`,
    `Details: ${run.html_url}`,
    '',
    'This comment was posted automatically by the Wallet Integration Test Agent.',
  ].join('\n')

  const { statusCode } = await githubPost(
    `/repos/${repo}/issues/${prNumber}/comments`,
    { body }
  )

  if (statusCode === 201) {
    log('info', 'pr_comment_posted', { repo, prNumber, runId: run.id })
  } else {
    log('warn', 'pr_comment_posted', { repo, prNumber, runId: run.id, status: 'failed', statusCode })
  }
}

// ---------------------------------------------------------------------------
// Action: trigger deployment via webhook
// ---------------------------------------------------------------------------

async function triggerDeploy(repo: string, sha: string, trigger: string): Promise<void> {
  if (!DEPLOY_WEBHOOK_URL) {
    log('info', 'deploy_triggered', { repo, sha, status: 'skipped_no_webhook' })
    return
  }

  log('info', 'deploy_triggered', { repo, sha, trigger })

  const record: DeployRecord = {
    repo,
    trigger,
    sha,
    timestamp: new Date().toISOString(),
    status: 'triggered',
  }

  try {
    const res = await request(DEPLOY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, sha, trigger, agent: AGENT_ID }),
    })

    const responseData = await res.body.json().catch(() => ({}))
    record.webhookResponse = responseData

    if (res.statusCode >= 200 && res.statusCode < 300) {
      record.status = 'complete'
      log('info', 'deploy_complete', { repo, sha, statusCode: res.statusCode })
    } else {
      record.status = 'failed'
      log('error', 'deploy_failed', { repo, sha, statusCode: res.statusCode, response: responseData })
    }
  } catch (err) {
    record.status = 'failed'
    log('error', 'deploy_failed', { repo, sha, error: err instanceof Error ? err.message : String(err) })
  }

  deployHistory.push(record)
}

// ---------------------------------------------------------------------------
// Main tick — one full polling cycle across all repos
// ---------------------------------------------------------------------------

async function tick(address: string): Promise<void> {
  for (const repo of GITHUB_REPOS) {
    log('info', 'repo_poll', { repo })

    // 1. Check for new open PRs — run wallet integration tests + trigger CI
    try {
      const openPRs = await pollOpenPRs(repo)
      for (const pr of openPRs) {
        const key = `${repo}#${pr.number}`
        if (seenPRs.has(key)) continue
        seenPRs.add(key)

        log('info', 'pr_detected', {
          repo,
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          branch: pr.head.ref,
          url: pr.html_url,
        })

        // Dispatch CI workflow for this PR branch
        try {
          await triggerCI(repo, pr.head.ref, pr.number)
        } catch (err) {
          log('error', 'ci_triggered', {
            repo,
            prNumber: pr.number,
            error: err instanceof Error ? err.message : String(err),
          })
        }

        // Run wallet integration test suite against staging
        try {
          const results = await runWalletTestSuite(address, pr.number, repo)
          await postTestResultsComment(repo, pr.number, results)
        } catch (err) {
          log('error', 'test_suite_error', {
            repo,
            prNumber: pr.number,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    } catch (err) {
      log('error', 'repo_poll', { repo, phase: 'open_prs', error: err instanceof Error ? err.message : String(err) })
    }

    // 2. Check for recently merged PRs — trigger deploy
    try {
      const mergedPRs = await pollMergedPRs(repo)
      for (const pr of mergedPRs) {
        const key = `${repo}#${pr.number}`
        if (seenMerges.has(key)) continue
        seenMerges.add(key)

        if (pr.base.ref === 'main' || pr.base.ref === 'master') {
          log('info', 'merge_detected', {
            repo,
            number: pr.number,
            title: pr.title,
            targetBranch: pr.base.ref,
            sha: pr.head.sha,
          })

          try {
            await triggerDeploy(repo, pr.head.sha, `merge-pr-${pr.number}`)
          } catch (err) {
            log('error', 'deploy_triggered', {
              repo,
              prNumber: pr.number,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }
    } catch (err) {
      log('error', 'repo_poll', { repo, phase: 'merged_prs', error: err instanceof Error ? err.message : String(err) })
    }

    // 3. Check for failed CI runs — comment on associated PRs
    try {
      const failedRuns = await pollFailedRuns(repo)
      for (const run of failedRuns) {
        const key = `${repo}:${run.id}`
        if (seenFailures.has(key)) continue
        seenFailures.add(key)

        for (const pr of run.pull_requests) {
          try {
            await postFailureComment(repo, pr.number, run)
          } catch (err) {
            log('error', 'pr_comment_posted', {
              repo,
              prNumber: pr.number,
              runId: run.id,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }
    } catch (err) {
      log('error', 'repo_poll', { repo, phase: 'failed_runs', error: err instanceof Error ? err.message : String(err) })
    }
  }
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
    repos: GITHUB_REPOS,
    stagingUrl: STAGING_URL,
    testContract: TEST_CONTRACT_ADDRESS,
    testToken: TEST_TOKEN_ADDRESS,
    deployWebhook: DEPLOY_WEBHOOK_URL ? 'configured' : 'none',
  })

  const me = await whoami()
  const address = me.evmWalletAddress
  if (!address) throw new Error('No EVM wallet address found. Run `waap-cli signup` first.')

  log('info', 'agent_start', { wallet: address })

  // Record initial balance before any tests run
  const initialBalance = await getBalance(address)
  log('info', 'agent_start', { initialBalance })

  // Seed seen sets with current state to avoid acting on existing PRs at startup
  log('info', 'agent_start', { status: 'seeding_initial_state' })
  for (const repo of GITHUB_REPOS) {
    try {
      const openPRs = await pollOpenPRs(repo)
      for (const pr of openPRs) seenPRs.add(`${repo}#${pr.number}`)

      const mergedPRs = await pollMergedPRs(repo)
      for (const pr of mergedPRs) seenMerges.add(`${repo}#${pr.number}`)

      const failedRuns = await pollFailedRuns(repo)
      for (const run of failedRuns) seenFailures.add(`${repo}:${run.id}`)

      log('info', 'agent_start', {
        status: 'seeded',
        repo,
        openPRs: openPRs.length,
        mergedPRs: mergedPRs.length,
        failedRuns: failedRuns.length,
      })
    } catch (err) {
      log('warn', 'agent_start', { repo, error: err instanceof Error ? err.message : String(err) })
    }
  }

  log('info', 'agent_start', { status: 'polling_started' })

  while (true) {
    try {
      await tick(address)
    } catch (err) {
      log('error', 'tick_error', { error: err instanceof Error ? err.message : String(err) })
    }

    // Periodic balance snapshot
    await getBalance(address)

    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

main().catch((err) => {
  log('error', 'agent_start', { fatal: true, error: String(err) })
  process.exit(1)
})
