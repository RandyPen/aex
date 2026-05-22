---
name: {{projectName}}
description: Trade Polymarket prediction markets on Polygon. Fetches open markets, constructs CLOB orders, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to find markets or place a Polymarket order.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD env var, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket trading (Hermes)

Hermes Agent skill for Polymarket. Uses the AgentSkills open standard.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP GET `${POLYMARKET_API_URL}/markets?status=open`
- HTTP POST `${POLYMARKET_API_URL}/order`

## Strategy

1. `GET /markets?status=open` to list active markets.
2. Pick a market matching the user's thesis — refuse if notional > `AGENT_MAX_ORDER_USD`.
3. Build the Order struct (see [Polymarket CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order)).
4. Sign via `waap-cli sign-typed-data`.
5. `POST /order` with `{ order, owner, orderType: "GTC" }`.

## Hard rules

- Never exceed `AGENT_MAX_ORDER_USD`.
- Refuse if `waap-cli whoami` fails.
- Always confirm with user before submitting (unless `AGENT_AUTO_MODE=1`).

## Recipe reference

{{recipeUrl}}
