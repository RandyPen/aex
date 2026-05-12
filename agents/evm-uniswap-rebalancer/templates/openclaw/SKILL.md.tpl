---
name: {{projectName}}
description: Manage a Uniswap v3 concentrated-liquidity position on Base. Reads tick range from positions(tokenId), checks current pool tick, and rebalances (decreaseLiquidity → collect → burn → mint new range) when out of range. Use when the user asks to manage a Uniswap v3 LP, rebalance a v3 position, or harvest CLMM fees.
compatibility: Requires @human.tech/waap-cli, a Base RPC, AGENT_POSITION_ID + AGENT_MAX_DEPOSIT_USD env vars
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Uniswap v3 LP Rebalancer (OpenClaw)

AgentSkills-compliant skill for any AgentSkills-compatible runtime. Manages a Uniswap v3 position on Base.

## Verified contract addresses (Base, chainId 8453)

- NonfungiblePositionManager: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- UniswapV3Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <addr> --value 0 --data <hex> --chain-id 8453 --json`
- On-chain reads via `eth_call` (`positions`, `slot0`, `tickSpacing`, `getPool`)

## Strategy

1. `positions(AGENT_POSITION_ID)` → range + token0/token1/fee/liquidity
2. `factory.getPool(token0, token1, fee)` → pool address
3. `pool.slot0()` → currentTick; `pool.tickSpacing()` for alignment
4. If currentTick ∈ [tickLower, tickUpper] → in-range, hold
5. Out-of-range → rebalance flow: `decreaseLiquidity → collect → burn → mint(new range)`. Center new range on currentTick, half-width `AGENT_RANGE_BPS / 2`, aligned to tickSpacing

## Hard rules

- Total redeployed USD ≤ `AGENT_MAX_DEPOSIT_USD`
- Bounded approvals only (never `type(uint256).max`)
- **`AGENT_DRY_RUN=1` (default): plan only, no submission**
- Refuse if `waap-cli whoami` doesn't match the position owner

## Recipe

{{recipeUrl}}
