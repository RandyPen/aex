---
name: {{projectName}}
description: Scan Polymarket for arbitrage opportunities and place hedged trades using the local WaaP wallet
---

# {{projectName}} — Polymarket arbitrage skill

Detect price discrepancies on Polymarket and place both legs of a hedged trade,
signing EIP-712 orders with the user's WaaP wallet via `waap-cli sign-typed-data`.

## Prerequisites

- `@human.tech/waap-cli` installed
- `AGENT_MAX_ORDER_USD` env var set — hard cap on any single order leg
- WaaP session active (`waap-cli whoami` returns an address)

## Instructions

When the user asks Claude to find or execute a Polymarket arbitrage:

1. Read `AGENT_MAX_ORDER_USD` from env. Refuse any leg above this.
2. Use `waap-cli whoami --json` to get the maker address.
3. Fetch active events from the Gamma API (`/events?active=true&closed=false`).
4. Run both detection strategies:
   - **Complementary arb**: within one market, check if YES + NO prices deviate
     from 1.0. Sum > 1.0 → sell both; sum < 1.0 → buy both.
   - **Related-market arb**: within an event with multiple markets, compare
     opposing outcomes whose implied probabilities should sum to 1.0.
5. Subtract estimated fees (~2% round-trip per leg) from the raw spread. Only
   act on opportunities whose post-fee profit exceeds `MIN_SPREAD_BPS`.
6. For the best opportunity, construct both Order structs per the
   [Polymarket CLOB docs](https://docs.polymarket.com/).
7. Sign each with `waap-cli sign-typed-data --data '<json>' --json`. The
   chainId travels inside the EIP-712 domain in the payload.
8. POST both signed orders to `${POLYMARKET_API_URL}/order`, back-to-back.
9. Report both order IDs and signature prefixes.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD` on any leg.
- **Never** read `~/.waap-cli/session.json` directly — always go through `waap-cli`.
- Decline if `waap-cli whoami` fails.
- If leg A submits but leg B fails, the position is unhedged — surface a clear
  warning for manual review.
- Confirm with the user before executing unless they opt into "auto-mode".

## Recipe

{{recipeUrl}}
