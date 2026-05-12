---
name: {{projectName}}
description: Trade on Polymarket prediction markets using the local WaaP wallet
---

# {{projectName}} — Polymarket trading skill

Sign EIP-712 orders for Polymarket using the user's WaaP wallet via `waap-cli sign-typed-data`.

## Prerequisites

- `@human.tech/waap-cli` installed
- `AGENT_MAX_ORDER_USD` env var set — hard cap on any single order
- WaaP session active (`waap-cli whoami` returns an address)

## Instructions

When the user asks Claude to find or place a Polymarket order:

1. Read `AGENT_MAX_ORDER_USD` from env. Refuse any order above this.
2. Use `waap-cli whoami --json` to get the maker address.
3. Construct the Polymarket order struct per the [Polymarket CLOB docs](https://docs.polymarket.com/).
4. Sign with `waap-cli sign-typed-data --chain-id {{chainId}} --data '<json>' --json`.
5. POST the signed order to `${POLYMARKET_API_URL}/order`.
6. Report back the order ID and signature prefix.

## Safety rails

- **Never** exceed `AGENT_MAX_ORDER_USD`.
- **Never** read `~/.waap-cli/session.json` directly — always go through `waap-cli`.
- Decline if `waap-cli whoami` fails.
- Confirm with the user before each order unless they opt into "auto-mode".

## Recipe

{{recipeUrl}}
