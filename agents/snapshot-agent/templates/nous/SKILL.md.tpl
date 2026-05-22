---
name: {{projectName}}
description: Monitor Snapshot governance spaces and cast EIP-712 votes using the local WaaP wallet. Use when the user asks to review active proposals, vote on a DAO proposal, or follow a delegator strategy.
compatibility: Requires @human.tech/waap-cli and SNAPSHOT_SPACES env var
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
---

# {{projectName}} — Snapshot governance (Hermes)

Hermes Agent skill for Snapshot. Uses the AgentSkills open standard.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP POST `${SNAPSHOT_HUB_URL}/graphql`   (reads: proposals + scores)
- HTTP POST `${SNAPSHOT_SEQUENCER_URL}`     (writes: submit `{address, sig, data}`)

## Vote message (EIP-712)

- Domain: `{ name: "snapshot", version: "0.1.4" }`
- Type `Vote`: `from: string, space: string, timestamp: uint64, proposal: string, choice: uint32, reason: string, app: string, metadata: string`

## Strategy

`AGENT_VOTE_STRATEGY` controls selection: `delegate` (default) / `conservative` / `abstain-on-unknown`. See the standalone `agent.ts` in the companion recipe for the reference logic.

## Hard rules

- Only vote in spaces listed in `SNAPSHOT_SPACES`.
- Show proposal title + choice to user before signing.
- **`AGENT_DRY_RUN=1` (default): don't sign, just report.**
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
