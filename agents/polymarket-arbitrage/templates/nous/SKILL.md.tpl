---
name: {{projectName}}
description: Arbitrage Polymarket prediction markets on Polygon. Scans events for price discrepancies between complementary and related markets, builds both legs of a hedged CLOB trade, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to find or execute a Polymarket arbitrage.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD env var, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket arbitrage (Hermes)

Hermes Agent skill for Polymarket arbitrage. Uses the AgentSkills open standard.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP GET `https://gamma-api.polymarket.com/events?active=true&closed=false`
- HTTP POST `${POLYMARKET_API_URL}/order`

## Strategy

1. `GET /events?active=true&closed=false` to list active events and markets.
2. Detect arbitrage:
   - **Complementary**: within a single market, YES + NO prices should sum to
     1.0. Sum > 1.0 → sell both legs; sum < 1.0 → buy both legs.
   - **Related-market**: within an event with multiple markets, opposing
     outcomes should have implied probabilities summing to 1.0. Flag pairs that
     deviate beyond the heuristic band.
3. Subtract estimated fees (~2% round-trip per leg) from the raw spread; only
   act on post-fee profit above `MIN_SPREAD_BPS`.
4. Build both Order structs (see [Polymarket CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order)).
5. Sign each via `waap-cli sign-typed-data` — chainId is carried inside the
   EIP-712 domain in the payload.
6. `POST /order` for both legs, back-to-back, with `{ order, owner, signature }`.

## Hard rules

- Never exceed `AGENT_MAX_ORDER_USD` on any leg.
- Refuse if `waap-cli whoami` fails.
- If leg A submits but leg B fails the position is unhedged — log a warning for
  manual review, never proceed silently.
- Always confirm with the user before submitting (unless `AGENT_AUTO_MODE=1`).

## Recipe reference

{{recipeUrl}}
