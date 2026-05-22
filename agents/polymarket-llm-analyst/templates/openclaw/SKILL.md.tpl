---
name: {{projectName}}
description: LLM-driven Polymarket trading on Polygon. Fetches open markets, asks an LLM to assess each question and return side + confidence, places confidence-gated CLOB bets, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to analyze markets or place an LLM-driven Polymarket bet.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD, LLM_PROVIDER + LLM_API_KEY env vars, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket LLM analyst

Skill for Hermes Agent / OpenClaw / Claude Code / any AgentSkills-compatible
runtime. Uses an LLM to assess Polymarket markets and places confidence-gated
EIP-712 orders via `waap-cli sign-typed-data` and the Polymarket CLOB REST API.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP GET `https://gamma-api.polymarket.com/events?active=true&closed=false`
- HTTP to the configured LLM provider (Anthropic or OpenAI)
- HTTP POST `${POLYMARKET_API_URL}/order` with `{ order, owner, signature }`

## Strategy

1. Fetch active markets from the Gamma API.
2. For each market, send the question plus context (description, current
   prices, volume) to the LLM. The LLM returns strict JSON:
   `{ side: "YES"|"NO", confidence: 0..1, reasoning: "..." }`.
3. Skip any market where `confidence < CONFIDENCE_THRESHOLD` (default 0.7).
4. For markets that clear the bar, construct the Polymarket Order struct for
   the LLM-chosen side per the [CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order); **refuse if notional > `AGENT_MAX_ORDER_USD`**.
5. Sign with `waap-cli sign-typed-data` — the chainId is carried inside the
   EIP-712 domain in the payload.
6. POST `{ order: <signed>, owner, signature }` to `${POLYMARKET_API_URL}/order`.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD`.
- **Never** read `~/.waap-cli/session.json`.
- Decline if `waap-cli whoami` fails.
- The LLM is a signal source, not an oracle — sub-threshold confidence means
  skip, never force a trade.
- Confirm every order with the user unless `AGENT_AUTO_MODE=1`.

## Production note

The Order struct is involved — use the [Polymarket CLOB SDK](https://github.com/Polymarket/clob-client-v2) to build orders in production rather than hand-constructing them.

## Recipe reference

{{recipeUrl}}
