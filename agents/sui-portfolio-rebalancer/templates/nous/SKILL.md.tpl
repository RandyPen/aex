---
name: {{projectName}}
description: Grid-trading portfolio rebalancer on Cetus DEX (Sui). Reads CLMM pool sqrtPrice, swaps via the Cetus aggregator when price hits HIGH_PRICE_THRESHOLD or LOW_PRICE_THRESHOLD to keep TARGET_ALLOCATION_USD in TARGET_TOKEN_TYPE. Use when the user asks to monitor price, rebalance, or run a grid strategy on a Sui pair.
compatibility: Requires @human.tech/waap-cli (chain set to sui:mainnet), TARGET + QUOTE tokens in the agent's Sui wallet
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: sui
  chainId: "{{chainId}}"
---

# {{projectName}} — Sui portfolio rebalancer (Hermes)

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --chain sui:mainnet --json`
- Sui fullnode RPC (`SUI_RPC` or default `https://fullnode.mainnet.sui.io`)
- Cetus CLMM SDK + Cetus aggregator HTTP API

## Strategy

1. Poll the Cetus pool (`CETUS_POOL_ID`) every `POLL_INTERVAL_MS` for `current_sqrt_price`.
2. Convert to a human-readable USD price for TARGET via the Cetus CLMM SDK.
3. If `price >= HIGH_PRICE_THRESHOLD`: route TARGET → QUOTE to return holdings to `TARGET_ALLOCATION_USD`.
4. If `price <= LOW_PRICE_THRESHOLD`: route QUOTE → TARGET to top up to `TARGET_ALLOCATION_USD`.
5. Build the Sui programmable transaction block, apply min-out per `SLIPPAGE_BPS`, submit via `waap-cli send-tx`.

## Hard rules

- Never swap beyond the amount needed to rebalance.
- Never route outside the configured pair.
- Refuse if `waap-cli whoami` fails (unless `WAAP_AGENT_ADDRESS` is set).

## Recipe reference

{{recipeUrl}}
