# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

The agent monitors a Uniswap V3 pool's price and rebalances holdings between
TARGET_TOKEN and QUOTE_TOKEN whenever the price crosses configurable high/low
thresholds. Sell into strength, buy into weakness, maintain a target USD
allocation.

## Commands

- `waap-cli whoami --json`
- `waap-cli send-tx --to <router> --data <swapCalldata> --chain base --json`
- Read pool state via JSON-RPC `eth_call` to `POOL_ADDRESS.slot0()`

## Hard limits

- Chain is Base (id 8453). Use `--chain base` on `send-tx`.
- Never swap more than what's needed to bring holdings back to `TARGET_ALLOCATION_USD`.
- Respect `SLIPPAGE_BPS` — set `amountOutMinimum` accordingly.
- Only the configured `POOL_ADDRESS` and `DEX_ROUTER` are valid swap targets.

## Extending

- Adjust the grid by tightening or widening `HIGH_PRICE_THRESHOLD` / `LOW_PRICE_THRESHOLD`.
- Increase `POLL_INTERVAL_MS` to reduce RPC calls at the cost of slower reactions.
- Add a hysteresis band by widening thresholds to avoid whipsaw rebalances.

## Recipe

{{recipeUrl}}
