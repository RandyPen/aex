---
name: {{projectName}}
description: Monitor Snapshot governance spaces and cast EIP-712 votes using the local WaaP wallet. Use when the user asks to review active proposals, vote on a DAO proposal, or follow a delegator strategy.
compatibility: Requires @human.tech/waap-cli and SNAPSHOT_SPACES env var
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
---

# {{projectName}} — Snapshot governance

Skill for any AgentSkills-compatible runtime (OpenClaw / Claude Code /
Hermes / …). Signs Snapshot Vote messages via `waap-cli sign-typed-data`
and submits them to the Snapshot Sequencer.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --chain-id 1 --data <json> --json`
- HTTP POST `${SNAPSHOT_HUB_URL}/graphql`   (list active proposals + scores — hub.snapshot.org)
- HTTP POST `${SNAPSHOT_SEQUENCER_URL}`     (submit signed vote — seq.snapshot.org, NOT hub.snapshot.org/api/msg)

## EIP-712 Vote message

Per [snapshot.js](https://github.com/snapshot-labs/snapshot.js):

- Domain: `{ name: "snapshot", version: "0.1.4" }`
- Primary type: `Vote`
- Vote type fields (all strings/uint unless noted):
  `from: string`, `space: string`, `timestamp: uint64`, `proposal: string`,
  `choice: uint32`, `reason: string`, `app: string`, `metadata: string`

Note: `from` and `proposal` are **string** not `address`/`bytes32` — the Sequencer rejects other types.

## Strategy (driven by `AGENT_VOTE_STRATEGY`)

- `delegate` (default) — vote the currently-leading choice; abstain if `scores_total == 0`.
- `conservative` — vote only when the leading choice has ≥60% of weight.
- `abstain-on-unknown` — vote only when delegators have cast (`scores_total > 0`).

## Safety rails

- Only vote in spaces listed in `SNAPSHOT_SPACES`.
- Show the user the proposal title + choice before signing.
- **If `AGENT_DRY_RUN=1` (default): stop before signing; just report intent.**
- Decline if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
