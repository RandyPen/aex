# {{projectName}} (Claude runtime)

Recurring payments skill for Claude Code. Reads a JSON schedule and submits
native or ERC-20 transfers when each payment is due.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required: `PAYMENT_CONFIG_PATH` |

## Use it

1. `cp .env.example .env` and set `PAYMENT_CONFIG_PATH`.
2. Create your `payments.json` (see SKILL.md for the schema).
3. Fund the wallet (`waap-cli whoami`) with native + token balance on the target chain(s).
4. Open this folder in Claude Code.
5. Ask Claude to check due payments and process them.

## Recipe

{{recipeUrl}}
