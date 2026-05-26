---
name: {{projectName}}
description: Grid-trading portfolio rebalancer on Uniswap V3 (Base). Reads pool slot0, sells TARGET_TOKEN when price > HIGH_PRICE_THRESHOLD and buys when price < LOW_PRICE_THRESHOLD, holding TARGET_ALLOCATION_USD in TARGET_TOKEN. Use when the user asks to monitor price, rebalance a position, or run a grid strategy on an EVM pair.
compatibility: Requires @human.tech/waap-cli, TARGET + QUOTE tokens on Base in the agent wallet
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — EVM portfolio rebalancer (Hermes)

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <router> --data <calldata> --chain base --json`
- JSON-RPC `eth_call` to `POOL_ADDRESS.slot0()` and ERC-20 `balanceOf`

## Strategy

1. Poll the Uniswap V3 pool every `POLL_INTERVAL_MS` ms.
2. Compute price from `sqrtPriceX96` using `TARGET_DECIMALS`, `QUOTE_DECIMALS`, and `TOKEN0_IS_TARGET`.
3. If `price >= HIGH_PRICE_THRESHOLD`: sell enough TARGET → QUOTE on `DEX_ROUTER` to return to `TARGET_ALLOCATION_USD`.
4. If `price <= LOW_PRICE_THRESHOLD`: buy QUOTE → TARGET to return to `TARGET_ALLOCATION_USD`.
5. Build `exactInputSingle` calldata with `fee = POOL_FEE` and `amountOutMinimum` per `SLIPPAGE_BPS`.

## Hard rules

- Never swap more than needed to return to `TARGET_ALLOCATION_USD`.
- Never swap through a router other than `DEX_ROUTER`.
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
