# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

## Commands

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --chain-id {{chainId}} --data '<json>' --json`
- Standard HTTP to `POLYMARKET_API_URL`

## Hard limits

- `AGENT_MAX_ORDER_USD` env var must be set. Refuse orders above it.
- Only Polygon (chain id 137) is supported in this template.

## Extending

- Polymarket has both buy and sell paths — this skill is buy-only by default.
- Add `AGENT_AUTO_MODE=1` to skip user confirmation per-order (dangerous — use only in trusted envs).

## Recipe

{{recipeUrl}}
