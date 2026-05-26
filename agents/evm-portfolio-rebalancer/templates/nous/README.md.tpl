# {{projectName}} (Hermes Agent / Nous runtime)

Portfolio rebalancer skill for Hermes Agent. Grid-trades a TARGET/QUOTE pair on
Uniswap V3 (Base) using the local WaaP wallet.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: token addresses, thresholds, router, pool |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and fill in required vars
3. Fund the wallet (`waap-cli whoami`) with TARGET + QUOTE tokens on Base
4. Register this skill with Hermes, then ask it to run the rebalancer

## Recipe

{{recipeUrl}}
