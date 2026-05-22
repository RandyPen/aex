# {{projectName}} (Claude runtime)

LLM-driven Polymarket analyst skill for Claude Code. Uses an LLM to assess
market questions and place confidence-gated bets.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required vars (`AGENT_MAX_ORDER_USD`, `LLM_PROVIDER`, `LLM_API_KEY`) |

## Use it

1. `cp .env.example .env` and set `AGENT_MAX_ORDER_USD`, `LLM_PROVIDER`
   (`anthropic` or `openai`) and `LLM_API_KEY`.
2. Open this folder in Claude Code.
3. Ask Claude to scan markets, run LLM analysis, and place a test bet on a
   high-confidence market within your cap.

## Recipe

{{recipeUrl}}
