# {{projectName}} (Claude runtime)

Polymarket arbitrage skill for Claude Code. Scans for price discrepancies
between related markets and places opposing legs to capture the spread.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required vars (`AGENT_MAX_ORDER_USD` is required) |

## Use it

1. `cp .env.example .env` and set `AGENT_MAX_ORDER_USD` (and optionally
   `MIN_SPREAD_BPS`).
2. Open this folder in Claude Code.
3. Ask Claude to scan markets for arbitrage opportunities or execute a hedged
   pair within your cap.

## Recipe

{{recipeUrl}}
