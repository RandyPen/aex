---
name: {{projectName}}
description: Analyze Polymarket questions with an LLM and place confidence-gated bets using the local WaaP wallet
---

# {{projectName}} — Polymarket LLM analyst skill

Use an LLM to assess Polymarket markets, then sign EIP-712 orders for
high-confidence bets with the user's WaaP wallet via `waap-cli sign-typed-data`.

## Prerequisites

- `@human.tech/waap-cli` installed
- `AGENT_MAX_ORDER_USD` env var set — hard cap on any single order
- `LLM_PROVIDER` (`anthropic` or `openai`) and `LLM_API_KEY` set
- WaaP session active (`waap-cli whoami` returns an address)

## Instructions

When the user asks Claude to analyze markets or place a Polymarket bet:

1. Read `AGENT_MAX_ORDER_USD` from env. Refuse any order above this.
2. Use `waap-cli whoami --json` to get the maker address.
3. Fetch active markets from the Gamma API (`/events?active=true&closed=false`).
4. For each market, send the question plus context (description, current
   prices, volume) to the configured LLM. The LLM returns a strict JSON object:
   `{ side: "YES"|"NO", confidence: 0..1, reasoning: "..." }`.
5. Skip any market where `confidence < CONFIDENCE_THRESHOLD` (default 0.7).
6. For a market that clears the bar, buy the LLM-chosen side: construct the
   Polymarket Order struct per the [CLOB docs](https://docs.polymarket.com/).
7. Sign with `waap-cli sign-typed-data --data '<json>' --json`. The chainId
   travels inside the EIP-712 domain in the payload.
8. POST the signed order to `${POLYMARKET_API_URL}/order`.
9. Report the order ID, the LLM's confidence and reasoning, and the signature
   prefix.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD`.
- **Never** read `~/.waap-cli/session.json` directly — always go through `waap-cli`.
- Decline if `waap-cli whoami` fails.
- The LLM is a signal source, not an oracle — treat low-confidence output as a
  skip, never force a trade.
- Confirm with the user before each order unless they opt into "auto-mode".

## Recipe

{{recipeUrl}}
