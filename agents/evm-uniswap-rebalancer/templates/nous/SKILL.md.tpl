---
name: {{projectName}}
description: Manage a Uniswap v3 concentrated-liquidity position on Base. Reads tick range from positions(tokenId), checks current pool tick, and rebalances (decreaseLiquidity → collect → burn → mint new range) when out of range. Use when the user asks to manage a Uniswap v3 LP, rebalance a v3 position, or harvest CLMM fees.
compatibility: Requires @human.tech/waap-cli, a Base RPC, AGENT_POSITION_ID + AGENT_MAX_DEPOSIT_USD env vars
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Uniswap v3 LP Rebalancer (Hermes)

Hermes Agent skill for Uniswap v3 LP management on Base.

## Verified contracts (Base, chainId 8453)

- NPM: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <addr> --value 0 --data <hex> --chain-id 8453 --json`
- viem / eth_call for `positions`, `slot0`, `tickSpacing`, `getPool`

## Strategy

1. `positions(AGENT_POSITION_ID)` → range + token0/1/fee/liquidity
2. `factory.getPool` + `pool.slot0` → current tick
3. In-range → hold. Out-of-range → `decreaseLiquidity → collect → burn → mint(new range)`
4. New range = currentTick ± `AGENT_RANGE_BPS / 2`, aligned to `tickSpacing`

## Hard rules

- Cap redeployed USD at `AGENT_MAX_DEPOSIT_USD`
- Bounded approvals
- `AGENT_DRY_RUN=1` default — no submission
- Refuse if `waap-cli whoami` ≠ position owner

## Recipe

{{recipeUrl}}
