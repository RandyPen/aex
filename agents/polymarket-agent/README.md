# Polymarket Trading Agent

Autonomous agent that polls Polymarket prediction markets, signs EIP-712 orders with the local WaaP wallet, and submits them to the Polymarket CLOB.

Runs on **Polygon** (chain id `137`).

## Status

MVP templates paired with the canonical [Polymarket recipe](https://docs.waap.xyz/recipes/waap-cli-polymarket-agent).
Templates will be expanded by [#383](https://github.com/holonym-foundation/internal-docs/issues/383) — this file tracks the current shape.

## What you'll get

- **Standalone runtime:** Node.js project with `agent.ts` that polls markets on a configurable interval, signs orders via `waap-cli sign-typed-data`, and submits via HTTP to the Polymarket CLOB.
- **Claude runtime:** `SKILL.md` teaching Claude to interact with Polymarket via the WaaP CLI.

## Env vars

| Key                      | Required    | Default                       | Description                                                                        |
| ------------------------ | ----------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `POLYMARKET_API_URL`     | no          | `https://clob.polymarket.com` | CLOB endpoint                                                                      |
| `AGENT_POLL_INTERVAL_MS` | no          | `60000`                       | Poll interval                                                                      |
| `AGENT_MAX_ORDER_USD`    | **yes**     | —                             | Hard cap per order                                                                 |
| `POLY_API_KEY`           | order-only† | —                             | CLOB L2 auth — API key                                                             |
| `POLY_API_SECRET`        | order-only† | —                             | CLOB L2 auth — secret used to compute the HMAC `POLY_SIGNATURE` header per request |
| `POLY_PASSPHRASE`        | order-only† | —                             | CLOB L2 auth — passphrase                                                          |
| `POLY_ADDRESS`           | no          | `waap-cli whoami`             | CLOB L2 auth — wallet address tied to the API key                                  |

† Required only when **submitting orders**. Read-only market polling works without these. Mint creds via Polymarket's clob-client `deriveApiKey()` or POST `/auth/derive-api-key` (signed L1 EIP-712). See [Polymarket CLOB authentication docs](https://docs.polymarket.com/developers/CLOB/authentication).

## Generate it

```bash
npx @human.tech/create-agent-wallet \
  --activity polymarket-agent \
  --runtime standalone \
  polymarket-agent
```
