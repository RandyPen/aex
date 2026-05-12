# {{projectName}} (Hermes Agent / Nous runtime)

Polymarket trading skill for Hermes Agent.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: `AGENT_MAX_ORDER_USD` |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and set `AGENT_MAX_ORDER_USD`
3. Register this skill with Hermes, then ask it to place a test order

## Recipe

{{recipeUrl}}
