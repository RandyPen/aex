# {{projectName}} — Snapshot Governance Agent

Monitors Snapshot spaces, signs EIP-712 votes via WaaP.

## Prerequisites

- `@human.tech/waap-cli` installed
- WaaP session with governance tokens delegated to it
- `SNAPSHOT_SPACES` env var set

## Run

```bash
cp .env.example .env
# Fill in SNAPSHOT_SPACES (e.g. SNAPSHOT_SPACES=aave.eth,uniswap.eth)
npm install
npm run dev
```

## Customize

The stub in `agent.ts` polls spaces and logs proposal counts. The full
strategy (vote selection per proposal) is in the recipe:

{{recipeUrl}}
