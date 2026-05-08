# Blank Project

Minimal WaaP agent scaffold. Creates a session (if needed) and signs one example message.

Good starting point for building a custom agent.

## Supported runtimes

- **Standalone** — Node.js project + Dockerfile, uses `@human.tech/waap-cli`
- **Claude** — SKILL.md + CLAUDE.md + mcp-config for Claude Code discovery

## Generate it

```bash
npx @human.tech/create-agent-wallet --activity blank-project --runtime standalone my-agent
cd my-agent
cp .env.example .env
npm install
npm run dev
```
