# {{projectName}} (Claude runtime)

Sui portfolio rebalancer skill for Claude Code. Watches Cetus pool price and
rebalances via the Cetus aggregator using the local WaaP wallet on Sui mainnet.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required vars (token types, allocation, thresholds, pool id) |

## Use it

1. `cp .env.example .env` and fill in required vars.
2. Fund the wallet (`waap-cli whoami`) with TARGET + QUOTE tokens on Sui.
3. `waap-cli chain set sui:mainnet`.
4. Open this folder in Claude Code.
5. Ask Claude to check the current price and rebalance if needed.

## Recipe

{{recipeUrl}}
