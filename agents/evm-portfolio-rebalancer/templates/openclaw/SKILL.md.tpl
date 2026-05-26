---
name: {{projectName}}
description: Grid-trading portfolio rebalancer on Uniswap V3 (Base). Sells TARGET_TOKEN when price > HIGH_PRICE_THRESHOLD, buys when price < LOW_PRICE_THRESHOLD, maintaining TARGET_ALLOCATION_USD. Use when the user asks to monitor price, rebalance, or run a grid strategy.
compatibility: Requires @human.tech/waap-cli, TARGET + QUOTE tokens on Base in the agent wallet
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — EVM portfolio rebalancer

Skill for any AgentSkills-compatible runtime. Reads Uniswap V3 pool state,
rebalances via `waap-cli send-tx` when price crosses thresholds.

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <router> --data <calldata> --chain base --json`
- JSON-RPC `eth_call` for `slot0()` and ERC-20 `balanceOf`

## Strategy

1. Read price from `POOL_ADDRESS.slot0()`.
2. Compare to `HIGH_PRICE_THRESHOLD` / `LOW_PRICE_THRESHOLD`.
3. On a trigger, compute the swap size required to return holdings to `TARGET_ALLOCATION_USD`.
4. Encode `exactInputSingle` (`fee = POOL_FEE`, `amountOutMinimum` per `SLIPPAGE_BPS`).
5. Submit via `waap-cli send-tx --to ${DEX_ROUTER} --chain base`.

## Safety rails

- **Never** swap beyond the amount needed to rebalance.
- **Never** target any router other than `DEX_ROUTER`.
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
