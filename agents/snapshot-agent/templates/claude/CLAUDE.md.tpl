# Project context for Claude Code — {{projectName}}

**Activity:** {{activityName}}
**Chain:** {{chainName}} (votes are off-chain; chain id is metadata)
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

## Commands

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data '<snapshot-vote-json>' --json`
- HTTP GET/POST to `${SNAPSHOT_HUB_URL}`

## Rules

- Only vote in spaces listed in `SNAPSHOT_SPACES`.
- Always confirm the vote choice with the user before signing.
- `AGENT_VOTE_STRATEGY` values: `delegate` (default, matches delegators), `conservative` (abstain on split), `abstain-on-unknown`.

## Recipe

{{recipeUrl}}
