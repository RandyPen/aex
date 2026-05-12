---
name: {{projectName}}
description: Trade Polymarket prediction markets on Polygon. Fetches open markets, constructs CLOB orders, signs via EIP-712 with the local WaaP wallet, submits to the Polymarket Sequencer. Use when the user asks to find markets or place a Polymarket order.
compatibility: Requires @human.tech/waap-cli, AGENT_MAX_ORDER_USD env var, and USDC + POL on Polygon
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: polygon
  chainId: "{{chainId}}"
---

# {{projectName}} — Polymarket trading

Skill for Hermes Agent / OpenClaw / Claude Code / any AgentSkills-compatible
runtime. Places EIP-712 orders on Polymarket via `waap-cli sign-typed-data`
and the Polymarket CLOB REST API.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --chain-id {{chainId}} --data <json> --json`
- HTTP GET `${POLYMARKET_API_URL}/markets?status=open`
- HTTP POST `${POLYMARKET_API_URL}/order` with `{ order, owner, orderType }`

## Strategy

1. Call `polymarket-get-markets` (HTTP GET).
2. Pick a market that matches the user's thesis; **refuse if notional > `AGENT_MAX_ORDER_USD`**.
3. Construct the Polymarket Order struct per the [CLOB docs](https://docs.polymarket.com/api-reference/trade/post-a-new-order).
4. Sign with `waap-cli sign-typed-data`.
5. POST `{ order: <signed>, owner, orderType: 'GTC' }` to `${POLYMARKET_API_URL}/order`.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD`.
- **Never** read `~/.waap-cli/session.json`.
- Decline if `waap-cli whoami` fails.
- Confirm every order with the user unless `AGENT_AUTO_MODE=1`.

## Production note

The Order struct is involved — use the [Polymarket CLOB SDK](https://github.com/Polymarket/clob-client-v2) to build orders in production rather than hand-constructing them.

## Recipe reference

{{recipeUrl}}
