# {{projectName}} (OpenClaw runtime)

AgentSkills-compliant skill. OpenClaw loads from
`~/.openclaw/workspace/skills/<name>/SKILL.md`.

## Install

```bash
cp -r ./ ~/.openclaw/workspace/skills/{{projectName}}
cp .env.example .env   # fill in tokens, thresholds, router, pool
```

Make sure the wallet from `waap-cli whoami` is funded with TARGET + QUOTE tokens on Base.

## Recipe

{{recipeUrl}}
