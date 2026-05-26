# {{projectName}} (OpenClaw runtime)

AgentSkills-compliant skill. OpenClaw loads from
`~/.openclaw/workspace/skills/<name>/SKILL.md`.

## Install

```bash
cp -r ./ ~/.openclaw/workspace/skills/{{projectName}}
cp .env.example .env   # fill in token types, allocation, thresholds, pool id
```

Set `waap-cli chain set sui:mainnet` and fund the wallet from `waap-cli whoami`
with TARGET + QUOTE tokens on Sui.

## Recipe

{{recipeUrl}}
