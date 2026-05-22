---
name: {{projectName}}
description: Arbitrage Polymarket prediction markets on Polygon. Scans events for price discrepancies between complementary and related markets, builds both legs of a hedged CLOB trade, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to find or execute a Polymarket arbitrage.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD env var, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket arbitrage

Skill for Hermes Agent / OpenClaw / Claude Code / any AgentSkills-compatible
runtime. Detects Polymarket price discrepancies and places both legs of a
hedged trade via `waap-cli sign-typed-data` and the Polymarket CLOB REST API.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data <json> --json`
- HTTP GET `https://gamma-api.polymarket.com/events?active=true&closed=false`
- HTTP POST `${POLYMARKET_API_URL}/order` with `{ order, owner, signature }`

## Strategy

1. Fetch active events from the Gamma API.
2. Detect arbitrage opportunities:
   - **Complementary arb**: within one market, YES + NO prices should sum to
     1.0. Sum > 1.0 → sell both; sum < 1.0 → buy both.
   - **Related-market arb**: within an event with multiple markets, opposing
     outcomes should have implied probabilities summing to 1.0.
3. Subtract estimated fees (~2% round-trip per leg); **refuse if post-fee
   profit < `MIN_SPREAD_BPS`** or if any leg notional > `AGENT_MAX_ORDER_USD`.
4. Construct both Polymarket Order structs per the [CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order).
5. Sign each with `waap-cli sign-typed-data` — the chainId is carried inside the
   EIP-712 domain in the payload.
6. POST both signed orders to `${POLYMARKET_API_URL}/order`, back-to-back.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD` on any leg.
- **Never** read `~/.waap-cli/session.json`.
- Decline if `waap-cli whoami` fails.
- If leg A fills but leg B fails the position is unhedged — log a warning for
  manual review.
- Confirm every trade with the user unless `AGENT_AUTO_MODE=1`.

## Production note

The Order struct is involved and leg risk is real — use the [Polymarket CLOB SDK](https://github.com/Polymarket/clob-client-v2) to build orders and consider websocket price feeds rather than polling in production.

## Recipe reference

{{recipeUrl}}
