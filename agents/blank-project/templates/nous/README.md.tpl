# {{projectName}} (Hermes Agent / Nous runtime)

AgentSkills-compliant skill for Hermes Agent (Nous Research).

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition — AgentSkills open standard |
| `.env.example` | Copy to `.env` for overrides |

## Use it

1. Install Hermes: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
2. Register this skill with Hermes (see Hermes docs for the exact `hermes skills add` command)
3. Ask Hermes to sign a message → it calls `waap-cli` per the instructions in `SKILL.md`

## Recipe

{{recipeUrl}}
