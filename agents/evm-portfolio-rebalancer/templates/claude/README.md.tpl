# {{projectName}} (Claude runtime)

EVM portfolio rebalancer skill for Claude Code. Watches a Uniswap V3 pool on
Base and rebalances when the price crosses the configured high/low thresholds.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required vars (tokens, allocation, thresholds, router, pool) |

## Use it

1. `cp .env.example .env` and fill in tokens, thresholds, router, pool.
2. Fund the wallet (`waap-cli whoami`) with TARGET + QUOTE tokens on Base.
3. Open this folder in Claude Code.
4. Ask Claude to check the current price and rebalance if needed.

## Recipe

{{recipeUrl}}
