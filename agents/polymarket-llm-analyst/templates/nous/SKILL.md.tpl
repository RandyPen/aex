---
name: {{projectName}}
description: LLM-driven Polymarket trading on Polygon. Fetches open markets, asks an LLM to assess each question and return side + confidence, places confidence-gated CLOB bets, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to analyze markets or place an LLM-driven Polymarket bet.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD, LLM_PROVIDER + LLM_API_KEY env vars, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket LLM analyst (Hermes)

Hermes Agent skill for LLM-driven Polymarket trading. Uses the AgentSkills open
standard.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP GET `https://gamma-api.polymarket.com/events?active=true&closed=false`
- HTTP to the configured LLM provider (Anthropic or OpenAI)
- HTTP POST `${POLYMARKET_API_URL}/order`

## Strategy

1. `GET /events?active=true&closed=false` to list active markets.
2. For each market, send the question plus context (description, prices,
   volume) to the LLM. The LLM returns strict JSON:
   `{ side: "YES"|"NO", confidence: 0..1, reasoning: "..." }`.
3. Skip any market where `confidence < CONFIDENCE_THRESHOLD` (default 0.7).
4. For markets that clear the bar, build the Order struct for the LLM-chosen
   side (see [Polymarket CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order)) — refuse if notional > `AGENT_MAX_ORDER_USD`.
5. Sign via `waap-cli sign-typed-data` — chainId is carried inside the EIP-712
   domain in the payload.
6. `POST /order` with `{ order, owner, signature }`.

## Hard rules

- Never exceed `AGENT_MAX_ORDER_USD`.
- `LLM_PROVIDER` must be `anthropic` or `openai`; `LLM_API_KEY` must be set.
- Refuse if `waap-cli whoami` fails.
- The LLM is a signal source — a sub-threshold confidence means skip, never
  force a trade.
- Always confirm with the user before submitting (unless `AGENT_AUTO_MODE=1`).

## Recipe reference

{{recipeUrl}}
