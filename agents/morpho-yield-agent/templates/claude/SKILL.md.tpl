---
name: {{projectName}}
description: Deposit into and rebalance across Morpho vaults using the local WaaP wallet
---

# {{projectName}} — Morpho yield skill

Finds the best-APY Morpho vault for `AGENT_ASSET` on chain {{chainId}}, deposits
up to `AGENT_MAX_DEPOSIT_USD`, rebalances when a better vault exceeds the
current one by `AGENT_MIN_APY_DELTA_BPS` basis points.

## Prerequisites

- `@human.tech/waap-cli` installed
- Wallet funded with `AGENT_ASSET` + gas token
- `AGENT_ASSET` + `AGENT_MAX_DEPOSIT_USD` env vars set

## Instructions

1. Call `waap-cli whoami --json` to get the wallet address.
2. GET `${MORPHO_API_URL}/vaults?asset=${AGENT_ASSET}&chainId={{chainId}}` to list vaults.
3. Sort by net APY.
4. If nothing deposited yet, `approve + deposit` into top vault (but never exceed `AGENT_MAX_DEPOSIT_USD`).
5. If already deposited, check if top vault's APY beats current by `AGENT_MIN_APY_DELTA_BPS` bps. If so, withdraw + redeposit.
6. Use `waap-cli send-tx` for all on-chain calls.

## Safety rails

- Never deposit more than `AGENT_MAX_DEPOSIT_USD`.
- Never approve unlimited token allowance — always bound to planned deposit + slippage.
- Refuse if `waap-cli whoami` fails.

## Recipe

{{recipeUrl}}
