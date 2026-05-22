# {{projectName}} (Hermes Agent / Nous runtime)

Polymarket arbitrage skill for Hermes Agent. Scans related markets for price
discrepancies and places hedged trades.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: `AGENT_MAX_ORDER_USD` |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and set `AGENT_MAX_ORDER_USD` (and optionally
   `MIN_SPREAD_BPS`)
3. Register this skill with Hermes, then ask it to scan for arbitrage

## Recipe

{{recipeUrl}}
