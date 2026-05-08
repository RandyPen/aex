# Project context for Claude Code — {{projectName}}

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Position NFT:** env `AGENT_POSITION_ID`
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

## Hard limits

- `AGENT_MAX_DEPOSIT_USD` is a total cap when reopening a position. Refuse any mint that would exceed it.
- `AGENT_RANGE_BPS` (default 500): tick-range half-width when opening the new position around the current tick.

## Key contract addresses (Base mainnet)

- NonfungiblePositionManager: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- UniswapV3Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`

## Commands

- `waap-cli whoami --json`
- `waap-cli send-tx --to 0x03a520b3... --value 0 --data <hex> --chain-id {{chainId}} --json`
- On-chain reads via viem (`positions`, `slot0`, `tickSpacing`, `getPool`)

## Recipe

{{recipeUrl}}
