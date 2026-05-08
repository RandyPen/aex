# {{projectName}} (Claude runtime)

Uniswap v3 LP rebalancer skill for Claude Code.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP wiring |
| `.env.example` | Required env vars (AGENT_POSITION_ID + AGENT_MAX_DEPOSIT_USD) |

## Use it

1. `cp .env.example .env` and set both required vars.
2. Open this folder in Claude Code.
3. Ask Claude to check the position and rebalance if out-of-range.

## Recipe

{{recipeUrl}}
