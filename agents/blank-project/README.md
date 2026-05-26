# Blank Project

Minimal WaaP agent scaffold. Creates a session (if needed) and signs one example message.

Good starting point for building a custom agent.

## Supported runtimes

- **Standalone** — Node.js project + Dockerfile, uses `@human.tech/waap-cli`
- **Claude** — SKILL.md + CLAUDE.md + mcp-config for Claude Code discovery
- **OpenClaw** — AgentSkills SKILL.md (open agentskills.io standard)
- **Nous / Hermes** — AgentSkills SKILL.md (open agentskills.io standard)

## Generate it

Pick the runtime that matches where you want the agent to run, then scaffold:

```bash
# Standalone (Node.js process or Docker container)
npx @human.tech/create-agent-wallet --activity blank-project --runtime standalone my-agent

# Claude Code
npx @human.tech/create-agent-wallet --activity blank-project --runtime claude my-agent

# OpenClaw
npx @human.tech/create-agent-wallet --activity blank-project --runtime openclaw my-agent

# Nous / Hermes
npx @human.tech/create-agent-wallet --activity blank-project --runtime nous my-agent
```

For the standalone runtime, then:

```bash
cd my-agent
cp .env.example .env
npm install
npm run dev
```
