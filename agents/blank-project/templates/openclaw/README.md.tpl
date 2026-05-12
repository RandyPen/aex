# {{projectName}} (OpenClaw runtime)

AgentSkills-compliant skill. OpenClaw loads skills from
`~/.openclaw/workspace/skills/<name>/SKILL.md` — copy (or symlink) this
directory in, then OpenClaw discovers it on next start.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition (AgentSkills open standard) |
| `.env.example` | Copy to `.env` for overrides |

## Install

```bash
# From the scaffolded directory:
cp -r ./ ~/.openclaw/workspace/skills/{{projectName}}
cp .env.example .env   # if any env vars are needed
```

## Validate

```bash
npx skills-ref validate .
```

## Recipe

{{recipeUrl}}
