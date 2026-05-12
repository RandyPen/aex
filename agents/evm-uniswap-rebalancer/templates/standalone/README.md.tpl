# {{projectName}} — Uniswap v3 LP Rebalancer (Base)

## Prerequisites

- Node.js 20+
- `@human.tech/waap-cli` (auto-installed via `npm install`)
- A WaaP session with the wallet that owns the Uniswap v3 NFT
- Existing v3 position NFT id (mint one in the Uniswap UI first)

## Run

```bash
cp .env.example .env
# Set AGENT_POSITION_ID + AGENT_MAX_DEPOSIT_USD
npm install
npm run dev
```

In dry-run mode (default), the agent reads pool state + position range and logs what it would do. Set `AGENT_DRY_RUN=0` for live rebalancing.

## What it does

1. Reads `positions(tokenId)` on the [NonfungiblePositionManager](https://basescan.org/address/0x03a520b32c04bf3beef7beb72e919cf822ed34f1) at `0x03a5...34f1`
2. Looks up the pool address via the [Factory](https://basescan.org/address/0x33128a8fc17869897dce68ed026d694621f6fdfd) at `0x3312...FDfD`
3. Reads current tick from `pool.slot0()`
4. If the position is **out of range**, the rebalance flow fires:
   - `decreaseLiquidity` to 0
   - `collect` tokens to owner
   - `burn` the empty NFT
   - Mint a new position centered on the current tick (stub — see recipe for amounts logic)
5. Polls every `AGENT_POLL_INTERVAL_MS` (default 15 min)

## Production-readiness

The mint step is intentionally a TODO stub. To go live, compute optimal `amount0Desired` / `amount1Desired` from the collected balances and the new tick range. See {{recipeUrl}}.

## Recipe

{{recipeUrl}}
