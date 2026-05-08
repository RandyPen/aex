---
name: {{projectName}}
description: Monitor Snapshot spaces and sign governance votes with the local WaaP wallet
---

# {{projectName}} — Snapshot governance skill

Sign Snapshot vote messages via `waap-cli sign-typed-data` and submit to the
Snapshot Sequencer.

## Prerequisites

- `@human.tech/waap-cli` installed
- `SNAPSHOT_SPACES` env var set (comma-separated)
- WaaP session active (`waap-cli whoami` returns an address)

## Instructions

When the user asks you to vote on a proposal:

1. Call `waap-cli whoami --json` to get the voter address.
2. Fetch the proposal via GraphQL at `${SNAPSHOT_HUB_URL}/graphql` (pull `id, title, choices, scores, scores_total, state`).
3. Apply `AGENT_VOTE_STRATEGY`:
   - `delegate` (default): pick the currently-leading choice; abstain if no weight exists yet.
   - `conservative`: vote only when the leading choice has ≥60% of weight; else abstain.
   - `abstain-on-unknown`: vote only when delegators have already cast (scores_total > 0).
4. Construct the Snapshot `Vote` EIP-712 message with domain `{name:'snapshot', version:'0.1.4'}` and types `{from:string, space:string, timestamp:uint64, proposal:string, choice:uint32, reason:string, app:string, metadata:string}`. **`from` and `proposal` are `string`, NOT `address`/`bytes32` — the Sequencer rejects otherwise.**
5. **If `AGENT_DRY_RUN=1` (default): STOP here and report what you would have done.**
6. Otherwise: sign with `waap-cli sign-typed-data --chain-id 1 --data '<typed-data-json>' --json`. POST `{address, sig, data: {domain, types, message}}` to `${SNAPSHOT_SEQUENCER_URL}` (default `https://seq.snapshot.org`). The `data` field contains the full EIP-712 payload, not just the message. Return the Sequencer response.

## Safety rails

- Always show the user the proposal title + choice before signing.
- Refuse if `waap-cli whoami` fails.
- Never sign a vote on behalf of a space not in `SNAPSHOT_SPACES`.
- Never reveal session file contents.

## Recipe

{{recipeUrl}}
