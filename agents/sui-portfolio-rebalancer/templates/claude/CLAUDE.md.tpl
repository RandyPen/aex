# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

The agent reads the Cetus CLMM pool's `sqrtPrice` on Sui, compares against
configurable high/low thresholds, and swaps via the Cetus aggregator to
maintain `TARGET_ALLOCATION_USD` worth of `TARGET_TOKEN_TYPE`.

## Commands

- `waap-cli whoami --json` (Sui address)
- `waap-cli send-tx --chain sui:mainnet --json` (signs and submits a built tx bytes)
- Cetus CLMM SDK / Cetus aggregator HTTP API for quoting + routing

## Hard limits

- Chain is Sui Mainnet. Use `--chain sui:mainnet` on `send-tx` (or `sui:testnet` if `NETWORK=testnet`).
- Only swap through the configured `CETUS_POOL_ID` / aggregator routes for the target pair.
- Honor `SLIPPAGE_BPS` — set the aggregator's min-out accordingly.
- Never swap more than what's needed to return holdings to `TARGET_ALLOCATION_USD`.

## Extending

- Override `SUI_RPC` to use a custom fullnode.
- Set `WAAP_AGENT_ADDRESS` to bypass `waap-cli whoami` (useful for read-only audits).
- Widen the high/low thresholds to reduce rebalance churn.

## Recipe

{{recipeUrl}}
