# Uniswap v3 LP Rebalancer

Monitor a Uniswap v3 concentrated-liquidity position on Base. When the pool tick moves out of the configured range, the agent decreases liquidity to 0, collects fees + tokens to the owner's EOA, and burns the position NFT. Hard cap on total deposited USD is enforced.

Runs on **Base** (chain id 8453).

## Status: Phase 1 — drain-and-stop

Auto-mint of a replacement position is **not yet implemented** in this starter. After unwinding, the agent emits a `rebalance_drained_no_remint` event and stops; you re-stake manually (or wait for Phase 2 of the [recipe](#full-tutorial), which will wire up automatic re-mint).

This is intentionally explicit so the starter doesn't quietly leave funds undeployed. If you'd rather have a monitor-only agent that never touches your position, set `AGENT_DRY_RUN=1` (the default).

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## Env

| Key                      | Required | Description                                                                       |
| ------------------------ | -------- | --------------------------------------------------------------------------------- |
| `AGENT_POSITION_ID`      | yes      | Uniswap v3 NPM token id of the position to manage                                 |
| `AGENT_MAX_DEPOSIT_USD`  | yes      | Hard cap on USD redeployed when reopening                                         |
| `AGENT_RANGE_BPS`        | no       | Range half-width in raw tick units around current tick (default 500 ≈ ±2.5%)      |
| `AGENT_MAX_SLIPPAGE_BPS` | no       | Slippage tolerated on `decreaseLiquidity` unwind, basis points (default 200 = 2%) |
| `RPC_URL`                | no       | Base RPC, defaults to `https://mainnet.base.org`                                  |
| `AGENT_POLL_INTERVAL_MS` | no       | Poll interval (default 15 min)                                                    |
| `AGENT_DRY_RUN`          | no       | `1` (default) = log only; `0` = live submission                                   |

## Verified contract addresses (Base mainnet)

- NonfungiblePositionManager: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- UniswapV3Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`

Verified 2026-04-29 against [Uniswap v3 deployments docs](https://developers.uniswap.org/contracts/v3/reference/deployments/base-deployments).

## Generate

```bash
npx @human.tech/create-agent-wallet --activity evm-uniswap-rebalancer --runtime standalone uniswap-bot
```

## Full tutorial

[docs.waap.xyz/recipes/waap-cli-uniswap-rebalancer](https://docs.waap.xyz/recipes/waap-cli-uniswap-rebalancer) (pending publication)
