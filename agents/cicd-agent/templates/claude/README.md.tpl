# {{projectName}} (Claude runtime)

Wallet integration test agent for Claude Code. The agent monitors GitHub PRs,
runs a 5-part wallet test suite against your staging environment, and posts
results back to the PR.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition |
| `CLAUDE.md` | Project context |
| `mcp-config.json` | WaaP MCP server config |
| `.env.example` | Required vars (`GITHUB_TOKEN`, `GITHUB_REPOS`, `STAGING_URL`, `TEST_CONTRACT_ADDRESS`, `TEST_TOKEN_ADDRESS`) |

## Use it

1. `cp .env.example .env` and fill in required vars.
2. Fund the wallet address from `waap-cli whoami` with testnet ETH on Base.
3. Open this folder in Claude Code.
4. Ask Claude to scan open PRs and run the wallet test suite.

## Recipe

{{recipeUrl}}
