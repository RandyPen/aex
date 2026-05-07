# Project context for Claude Code — {{projectName}}

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Asset:** env `AGENT_ASSET`
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

## Hard limits

- `AGENT_MAX_DEPOSIT_USD` is a total ceiling across all Morpho vaults. Refuse deposits that would exceed it.
- `AGENT_MIN_APY_DELTA_BPS` (default 50): minimum APY improvement before rebalancing.

## Commands

- `waap-cli whoami --json`
- `waap-cli send-tx --to <vault> --value 0 --data <calldata> --chain-id {{chainId}} --json`
- HTTP GET `${MORPHO_API_URL}/vaults?...`

## Recipe

{{recipeUrl}}
