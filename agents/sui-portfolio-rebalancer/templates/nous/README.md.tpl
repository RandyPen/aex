# {{projectName}} (Hermes Agent / Nous runtime)

Sui portfolio rebalancer skill for Hermes Agent. Grid-trades a TARGET/QUOTE
pair on Cetus DEX using the local WaaP wallet.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: token types, allocation, thresholds, pool id |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and fill in required vars
3. `waap-cli chain set sui:mainnet` and fund the wallet from `waap-cli whoami`
4. Register the skill, then ask Hermes to run a rebalance check

## Recipe

{{recipeUrl}}
