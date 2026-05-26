# {{projectName}} (OpenClaw runtime)

AgentSkills-compliant skill. OpenClaw loads from
`~/.openclaw/workspace/skills/<name>/SKILL.md`.

## Install

```bash
cp -r ./ ~/.openclaw/workspace/skills/{{projectName}}
cp .env.example .env   # set PAYMENT_CONFIG_PATH
```

Create your `payments.json` (see SKILL.md for schema) and fund the wallet from
`waap-cli whoami` on the chain(s) referenced in the config.

## Recipe

{{recipeUrl}}
