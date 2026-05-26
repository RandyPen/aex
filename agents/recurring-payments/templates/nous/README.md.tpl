# {{projectName}} (Hermes Agent / Nous runtime)

Recurring payments skill for Hermes Agent. Submits scheduled ERC-20 and native
transfers from the local WaaP wallet.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: `PAYMENT_CONFIG_PATH` |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and set `PAYMENT_CONFIG_PATH`
3. Create your `payments.json` (see SKILL.md for schema)
4. Fund the wallet (`waap-cli whoami`) on the target chain(s)
5. Register the skill, then ask Hermes to run a tick

## Recipe

{{recipeUrl}}
