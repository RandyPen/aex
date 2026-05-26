---
name: {{projectName}}
description: Grid-trading portfolio rebalancer on Cetus DEX (Sui). Reads the Cetus CLMM pool sqrtPrice, sells TARGET_TOKEN_TYPE when price > HIGH_PRICE_THRESHOLD and buys when price < LOW_PRICE_THRESHOLD to keep TARGET_ALLOCATION_USD in TARGET_TOKEN_TYPE. Use when the user asks to check price, rebalance, or run a grid strategy on a Sui pair.
---

# {{projectName}} — Sui portfolio rebalancer skill

Maintain a target USD allocation in `TARGET_TOKEN_TYPE` against
`QUOTE_TOKEN_TYPE` by swapping on Cetus when price crosses thresholds.

## Prerequisites

- `@human.tech/waap-cli` installed, logged in, chain set to `sui:mainnet`
- Wallet funded with TARGET + QUOTE on Sui
- All required env vars set

## Instructions

When the user asks to check or rebalance:

1. Read the Cetus pool object (`CETUS_POOL_ID`) via the Sui fullnode (or `SUI_RPC`) to get `current_sqrt_price`.
2. Derive price using the Cetus CLMM SDK (handles token decimals + a/b ordering).
3. Read balances of TARGET + QUOTE for the agent's Sui address (`waap-cli whoami --json` or `WAAP_AGENT_ADDRESS`).
4. Compare price to thresholds:
   - `price >= HIGH_PRICE_THRESHOLD`: ask the Cetus aggregator for a route `TARGET → QUOTE` sized to return holdings to `TARGET_ALLOCATION_USD`.
   - `price <= LOW_PRICE_THRESHOLD`: route `QUOTE → TARGET` sized to top up to `TARGET_ALLOCATION_USD`.
   - Otherwise: report and exit.
5. Build the Sui programmable transaction block from the aggregator response, apply min-out per `SLIPPAGE_BPS`, then `waap-cli send-tx --chain sui:mainnet --json` to sign + submit.

## Safety rails

- **Never** swap more than required to return to `TARGET_ALLOCATION_USD`.
- **Never** route through pools outside the configured `CETUS_POOL_ID` pair.
- **Never** read `~/.waap-cli/session.json` — always use `waap-cli`.
- Refuse if `waap-cli whoami` fails (unless `WAAP_AGENT_ADDRESS` is set).

## Recipe

{{recipeUrl}}
