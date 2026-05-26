# {{projectName}} (OpenClaw runtime)

AgentSkills-compliant skill. OpenClaw loads from
`~/.openclaw/workspace/skills/<name>/SKILL.md`.

## Install

```bash
cp -r ./ ~/.openclaw/workspace/skills/{{projectName}}
cp .env.example .env   # set GITHUB_TOKEN, GITHUB_REPOS, STAGING_URL, TEST_CONTRACT_ADDRESS, TEST_TOKEN_ADDRESS
```

Make sure the wallet from `waap-cli whoami` is funded with testnet ETH on Base.

## Recipe

{{recipeUrl}}
