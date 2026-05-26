---
name: {{projectName}}
description: Grid-trading portfolio rebalancer on Cetus DEX (Sui). Reads CLMM pool sqrtPrice, swaps via the Cetus aggregator when price hits HIGH_PRICE_THRESHOLD or LOW_PRICE_THRESHOLD to keep TARGET_ALLOCATION_USD in TARGET_TOKEN_TYPE. Use when the user asks to monitor price, rebalance, or run a grid strategy on a Sui pair.
compatibility: Requires @human.tech/waap-cli (chain set to sui:mainnet), TARGET + QUOTE tokens in the agent's Sui wallet
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: sui
  chainId: "{{chainId}}"
---

# {{projectName}} — Sui portfolio rebalancer

Skill for any AgentSkills-compatible runtime. Reads Cetus CLMM pool state via
the Sui fullnode, rebalances via the Cetus aggregator + `waap-cli send-tx`
when price crosses thresholds.

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --chain sui:mainnet --json`
- Sui fullnode RPC
- Cetus CLMM SDK + Cetus aggregator HTTP API

## Strategy

1. Read `CETUS_POOL_ID.current_sqrt_price`.
2. Compute USD price for TARGET via the Cetus CLMM SDK (handles decimals + a/b ordering).
3. Compare to `HIGH_PRICE_THRESHOLD` / `LOW_PRICE_THRESHOLD`.
4. On a trigger, ask the Cetus aggregator for a route sized to return holdings to `TARGET_ALLOCATION_USD`.
5. Build the Sui PTB with min-out per `SLIPPAGE_BPS`; submit via `waap-cli send-tx --chain sui:mainnet`.

## Safety rails

- **Never** swap more than required to rebalance.
- **Never** route outside the configured pair.
- Refuse if `waap-cli whoami` fails (unless `WAAP_AGENT_ADDRESS` is set).

## Production note

Use the Cetus aggregator (rather than a single direct pool swap) — it searches
across all Cetus pools and may split orders for better execution.

## Recipe reference

{{recipeUrl}}
