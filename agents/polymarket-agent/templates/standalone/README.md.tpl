# {{projectName}}

Polymarket trading agent scaffolded with `@human.tech/create-agent-wallet`.

**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## Prerequisites

- Node.js 20+
- `@human.tech/waap-cli` installed
- A WaaP session with POL / USDC on Polygon
- Polymarket account + API access

## Run locally

```bash
cp .env.example .env
# Fill in AGENT_MAX_ORDER_USD before starting
npm install
npm run dev
```

## Recipe

Full tutorial: {{recipeUrl}}

This starter is a stub that proves the scaffolding + `waap-cli sign-typed-data` wiring works. The recipe walks through market selection, order construction, and CLOB submission.
