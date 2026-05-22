import 'dotenv/config'
import { execa } from 'execa'
import { request } from 'undici'

const TAG = '[{{projectName}}]'
// Hub is used for GraphQL reads (proposals, scores).
// Sequencer is a separate host used for signed-envelope submissions.
// See snapshot.js/src/constants.json
const HUB = process.env.SNAPSHOT_HUB_URL ?? 'https://hub.snapshot.org'
const SEQUENCER = process.env.SNAPSHOT_SEQUENCER_URL ?? 'https://seq.snapshot.org'
const SPACES = (process.env.SNAPSHOT_SPACES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const STRATEGY = (process.env.AGENT_VOTE_STRATEGY ?? 'delegate') as
  | 'delegate'
  | 'conservative'
  | 'abstain-on-unknown'
const APP_TAG = process.env.AGENT_APP_TAG ?? 'waap-agentic-wallet'
// Default ON. Going live requires AGENT_DRY_RUN=0 explicitly — anything else
// (typo'd 'true', '0 ', missing, blank) keeps the agent in dry-run.
const DRY_RUN = process.env.AGENT_DRY_RUN !== '0'
const POLL_MS = Number(process.env.AGENT_POLL_INTERVAL_MS ?? 5 * 60 * 1000)

if (SPACES.length === 0) {
  console.error(`${TAG} SNAPSHOT_SPACES env var is required (comma-separated)`)
  process.exit(1)
}

interface Proposal {
  id: string
  title: string
  body: string
  choices: string[]
  start: number
  end: number
  scores?: number[]
  scores_total?: number
  state: 'active' | 'closed' | 'pending'
}

interface WhoamiResult {
  evmWalletAddress?: string
  suiWalletAddress?: string
  email?: string
}

// Vote messages already cast — in-memory to avoid double-voting within a run.
// Persist to disk if you want cross-restart dedup.
const voted = new Set<string>()

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

async function fetchActiveProposals(space: string): Promise<Proposal[]> {
  // Snapshot GraphQL — pull active proposals + current tallies.
  const query = {
    query: `query ($space: String!) {
      proposals(
        first: 50,
        where: { space: $space, state: "active" },
        orderBy: "created",
        orderDirection: desc
      ) {
        id title body choices start end scores scores_total state
      }
    }`,
    variables: { space },
  }
  const res = await request(`${HUB}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  })
  const json = (await res.body.json()) as {
    data?: { proposals?: Proposal[] }
    errors?: unknown
  }
  if (json.errors) {
    throw new Error(`Snapshot GraphQL error: ${JSON.stringify(json.errors)}`)
  }
  return json.data?.proposals ?? []
}

/**
 * Picks a choice (1-indexed) based on the configured strategy, or null to abstain.
 */
function pickChoice(p: Proposal): number | null {
  const scores = p.scores ?? []
  const total = p.scores_total ?? 0

  if (STRATEGY === 'abstain-on-unknown') {
    // Only vote when at least one delegator has cast — i.e. some score > 0.
    if (total <= 0) return null
    return leadingChoice(scores)
  }

  if (STRATEGY === 'conservative') {
    // Abstain unless the leading choice has >60% of weight.
    if (total <= 0) return null
    const lead = leadingChoice(scores)
    if (lead === null) return null
    const ratio = scores[lead - 1] / total
    return ratio >= 0.6 ? lead : null
  }

  // 'delegate' (default): follow the current leader; abstain only if no weight exists
  if (total <= 0) return null
  return leadingChoice(scores)
}

function leadingChoice(scores: number[]): number | null {
  if (scores.length === 0) return null
  let bestIdx = 0
  let bestVal = scores[0]
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestVal) {
      bestVal = scores[i]
      bestIdx = i
    }
  }
  // Snapshot choices are 1-indexed
  return bestVal > 0 ? bestIdx + 1 : null
}

/**
 * Build the EIP-712 typed-data payload for a Snapshot single-choice vote.
 * Matches the `Vote` domain/type published by Snapshot Sequencer:
 *   https://docs.snapshot.org/guides/vote
 */
function buildVoteTypedData(params: {
  voter: string
  space: string
  proposalId: string
  choice: number
}) {
  const timestamp = Math.floor(Date.now() / 1000)
  return {
    domain: { name: 'snapshot', version: '0.1.4' },
    primaryType: 'Vote',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      // Exact shape from snapshot.js `voteTypes`. `from` and `proposal` are
      // strings (not address/bytes32) — signatures are rejected otherwise.
      Vote: [
        { name: 'from', type: 'string' },
        { name: 'space', type: 'string' },
        { name: 'timestamp', type: 'uint64' },
        { name: 'proposal', type: 'string' },
        { name: 'choice', type: 'uint32' },
        { name: 'reason', type: 'string' },
        { name: 'app', type: 'string' },
        { name: 'metadata', type: 'string' },
      ],
    },
    message: {
      from: params.voter,
      space: params.space,
      timestamp,
      proposal: params.proposalId,
      choice: params.choice,
      reason: '',
      app: APP_TAG,
      metadata: '{}',
    },
  }
}

async function signTypedData(data: unknown): Promise<string> {
  const { stdout } = await execa('waap-cli', [
    'sign-typed-data',
    '--data',
    JSON.stringify(data),
    '--json',
  ])
  const parsed = parseWaapJson<{ signature: string }>(stdout)
  return parsed.signature
}

/**
 * Submit a signed vote envelope to the Snapshot Sequencer.
 *
 * Envelope shape matches snapshot.js `Client.send`:
 *   { address, sig, data: { domain, types, message } }
 *
 * The Sequencer lives at seq.snapshot.org (NOT hub.snapshot.org/api/msg —
 * that path is deprecated and silently rejects signatures).
 */
async function submitVote(
  address: string,
  sig: string,
  typedData: { domain: unknown; types: unknown; message: unknown },
): Promise<unknown> {
  const res = await request(SEQUENCER, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ address, sig, data: typedData }),
  })
  return res.body.json()
}

async function handleProposal(voter: string, space: string, p: Proposal): Promise<void> {
  if (voted.has(p.id)) return

  const choice = pickChoice(p)
  if (choice === null) {
    console.log(`${TAG} abstain on ${space}/${p.id.slice(0, 10)}… "${p.title}"`)
    return
  }

  console.log(
    `${TAG} ${space}/${p.id.slice(0, 10)}… "${p.title}" → choice ${choice}/${p.choices.length} "${p.choices[choice - 1]}"`,
  )

  const typedData = buildVoteTypedData({
    voter,
    space,
    proposalId: p.id,
    choice,
  })

  if (DRY_RUN) {
    console.log(`${TAG} [DRY_RUN] would sign + submit vote`)
    voted.add(p.id)
    return
  }

  const sig = await signTypedData(typedData)
  const result = await submitVote(voter, sig, typedData)
  console.log(`${TAG} submitted:`, result)
  voted.add(p.id)
}

async function tick(voter: string): Promise<void> {
  for (const space of SPACES) {
    const proposals = await fetchActiveProposals(space)
    if (proposals.length === 0) {
      console.log(`${TAG} ${space}: no active proposals`)
      continue
    }
    for (const p of proposals) {
      try {
        await handleProposal(voter, space, p)
      } catch (err) {
        console.error(
          `${TAG} vote failed for ${space}/${p.id}:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
  }
}

async function main(): Promise<void> {
  console.log(
    `${TAG} monitoring ${SPACES.length} space(s): ${SPACES.join(', ')} · strategy=${STRATEGY} · dry_run=${DRY_RUN}`,
  )
  const me = await whoami()
  const voter = me.evmWalletAddress
  if (!voter) throw new Error('no EVM wallet address — run `waap-cli signup` first')
  console.log(`${TAG} voter: ${voter}`)

  while (true) {
    try {
      await tick(voter)
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
