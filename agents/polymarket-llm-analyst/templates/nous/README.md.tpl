# {{projectName}} (Hermes Agent / Nous runtime)

LLM-driven Polymarket analyst skill for Hermes Agent.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | AgentSkills-compliant skill definition |
| `.env.example` | Required: `AGENT_MAX_ORDER_USD`, `LLM_PROVIDER`, `LLM_API_KEY` |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. `cp .env.example .env` and set `AGENT_MAX_ORDER_USD`, `LLM_PROVIDER` and
   `LLM_API_KEY`
3. Register this skill with Hermes, then ask it to analyze markets and place a
   test bet

## Recipe

{{recipeUrl}}
