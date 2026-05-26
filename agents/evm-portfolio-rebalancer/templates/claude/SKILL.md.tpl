---
name: {{projectName}}
description: Grid-trading rebalancer on Uniswap V3 (Base). Reads pool slot0, sells TARGET_TOKEN when price > HIGH_PRICE_THRESHOLD and buys when price < LOW_PRICE_THRESHOLD to maintain TARGET_ALLOCATION_USD. Use when the user asks to check price, rebalance, or run a grid strategy on an EVM token.
---

# {{projectName}} — EVM portfolio rebalancer skill

Maintain a target USD allocation in `TARGET_TOKEN` against `QUOTE_TOKEN` by
swapping on Uniswap V3 whenever price crosses configured thresholds.

## Prerequisites

- `@human.tech/waap-cli` installed and logged in
- Wallet funded with TARGET_TOKEN + QUOTE_TOKEN on Base
- All required env vars set

## Instructions

When the user asks Claude to check or rebalance:

1. Read pool state: `eth_call` to `POOL_ADDRESS.slot0()`, derive price from `sqrtPriceX96` using `TARGET_DECIMALS`/`QUOTE_DECIMALS` and `TOKEN0_IS_TARGET`.
2. Read current balances of TARGET and QUOTE for the wallet.
3. Compare price to `HIGH_PRICE_THRESHOLD` / `LOW_PRICE_THRESHOLD`:
   - If `price >= HIGH`: compute excess USD over `TARGET_ALLOCATION_USD`, encode `exactInputSingle(TARGET → QUOTE)` and `send-tx` to `DEX_ROUTER`.
   - If `price <= LOW`: compute USD shortfall, encode `exactInputSingle(QUOTE → TARGET)` and `send-tx`.
   - Otherwise: report price and do nothing.
4. Build calldata with `fee = POOL_FEE` and `amountOutMinimum` set per `SLIPPAGE_BPS`.
5. Submit via `waap-cli send-tx --to ${DEX_ROUTER} --data <calldata> --chain base --json`.

## Safety rails

- **Never** swap more than needed to return to `TARGET_ALLOCATION_USD`.
- **Never** swap through any contract other than `DEX_ROUTER`.
- **Never** read `~/.waap-cli/session.json` — always go via `waap-cli`.
- Refuse if `waap-cli whoami` fails or balances are zero.

## Recipe

{{recipeUrl}}
