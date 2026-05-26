# {{projectName}} (Hermes Agent / Nous runtime)

Wallet integration test skill for Hermes Agent. Watches GitHub PRs and runs a
real wallet test suite on staging using the local WaaP wallet on Base.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: `GITHUB_TOKEN`, `GITHUB_REPOS`, `STAGING_URL`, `TEST_CONTRACT_ADDRESS`, `TEST_TOKEN_ADDRESS` |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and fill in required vars
3. Fund the wallet from `waap-cli whoami` with testnet ETH on Base
4. Register this skill with Hermes, then ask it to scan repos for new PRs

## Recipe

{{recipeUrl}}
