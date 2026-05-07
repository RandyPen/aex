# {{projectName}} — Morpho Yield Agent

## Prerequisites

- `@human.tech/waap-cli` installed
- WaaP wallet funded with the asset named in `AGENT_ASSET`
- ETH for gas on chain {{chainId}}

## Run

```bash
cp .env.example .env
# Fill in AGENT_ASSET + AGENT_MAX_DEPOSIT_USD
npm install
npm run dev
```

## Customize

Stub polls Morpho's vault list and logs. Full rebalancing logic in the recipe:

{{recipeUrl}}
