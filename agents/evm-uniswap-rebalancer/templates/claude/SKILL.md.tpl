---
name: {{projectName}}
description: Manage a Uniswap v3 concentrated-liquidity position on Base. Reads tick range from positions(tokenId), checks current pool tick, and rebalances (decreaseLiquidity → collect → burn → mint new range) when the position goes out of range. Use when the user asks to manage a Uniswap v3 LP, rebalance a v3 position, or harvest fees from a CLMM range.
compatibility: Requires @human.tech/waap-cli, a Base RPC, AGENT_POSITION_ID env var, and AGENT_MAX_DEPOSIT_USD hard cap.
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: claude
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Uniswap v3 LP rebalancer skill

Skill for Claude Code. Manages a Uniswap v3 position on Base via the WaaP CLI.

## Prerequisites

- `@human.tech/waap-cli` installed and a WaaP session active (`waap-cli whoami` returns the position-owner address)
- `AGENT_POSITION_ID` set to the NFT token id of the position to manage
- `AGENT_MAX_DEPOSIT_USD` set as a hard cap

## Verified contract addresses (Base mainnet, chainId 8453)

- NonfungiblePositionManager: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- UniswapV3Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`

## Tools

- `waap-cli whoami --json` — confirm the wallet owns the position
- `waap-cli send-tx --to <addr> --value 0 --data <hex> --chain-id 8453 --json` — submit any of the rebalance txs
- On-chain reads via `eth_call` for `positions`, `slot0`, `tickSpacing`, `getPool`

## Strategy

1. Read `positions(AGENT_POSITION_ID)` → `(token0, token1, fee, tickLower, tickUpper, liquidity, ...)`. If `liquidity == 0`, stop — nothing to rebalance.
2. `factory.getPool(token0, token1, fee)` → pool address.
3. `pool.slot0()` → `currentTick`. `pool.tickSpacing()` for alignment.
4. If `tickLower ≤ currentTick ≤ tickUpper`, position is in-range — hold.
5. Out-of-range → rebalance:
   - `decreaseLiquidity({ tokenId, liquidity, amount0Min: 0, amount1Min: 0, deadline: now+600 })` → unwinds the position
   - `collect({ tokenId, recipient: owner, amount0Max: type(uint128).max, amount1Max: type(uint128).max })` → pulls tokens + fees to owner
   - `burn(tokenId)` → frees the NFT slot
   - `mint(MintParams)` with `tickLower/Upper` centered on `currentTick`, range half-width `AGENT_RANGE_BPS / 2`, aligned to `tickSpacing`. Compute `amount0Desired/amount1Desired` from collected balances; cap total USD via `AGENT_MAX_DEPOSIT_USD`.

## Hard rules

- Total redeployed USD ≤ `AGENT_MAX_DEPOSIT_USD`.
- Never set unlimited token allowance — bound to planned mint amounts.
- **`AGENT_DRY_RUN=1` (default): show the plan, don't submit any tx.**
- Refuse if `waap-cli whoami` doesn't match the position owner.

## Recipe

{{recipeUrl}}
