---
name: {{projectName}}
description: Find the best-APY Morpho Blue vault for a given asset and rebalance into it. Queries blue-api.morpho.org, checks current positions, approves + deposits or withdraws + redeposits when a better vault appears. Use when the user asks about yield on an asset or wants to optimize stablecoin yield.
compatibility: Requires @human.tech/waap-cli, viem-compatible Ethereum RPC, AGENT_ASSET (ERC-20 address), and AGENT_MAX_DEPOSIT_USD env vars
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: {{chainName}}
  chainId: "{{chainId}}"
---

# {{projectName}} — Morpho Yield

Skill for any AgentSkills-compatible runtime. Manages Morpho Blue vault
positions on chain {{chainId}}. Production-grade reference
implementation lives in the companion recipe.

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <addr> --value 0 --data <hex> --chain-id {{chainId}} --json`
- HTTP POST `https://blue-api.morpho.org/graphql` (list vaults)
- On-chain reads via `eth_call` to ERC-20 + ERC-4626 contracts (`allowance`, `balanceOf`, `convertToAssets`, `decimals`)

## Morpho GraphQL query

```graphql
query($asset: String!, $chainId: Int!) {
  vaults(where: { assetAddress_in: [$asset], chainId_in: [$chainId] }, first: 50) {
    items {
      address symbol name
      state { netApy totalAssetsUsd }
      asset { address decimals priceUsd }
    }
  }
}
```

`state.netApy` is a decimal fraction (0.0425 = 4.25%).

## Strategy

1. Call `blue-api.morpho.org` → list vaults for `AGENT_ASSET`.
2. Sort by `state.netApy` descending; pick the best.
3. Check on-chain position in every vault via `balanceOf` + `convertToAssets`.
4. If no position: `approve(bestVault, amount)` then `deposit(amount, owner)` — capped at `AGENT_MAX_DEPOSIT_USD`.
5. If position elsewhere and `(bestApy - heldApy) ≥ AGENT_MIN_APY_DELTA_BPS`: `withdraw(...)` then redeposit into winner.
6. Else: hold.

## Hard rules

- Never exceed `AGENT_MAX_DEPOSIT_USD` total.
- Bound token approvals to planned deposit + slippage — never unlimited.
- **`AGENT_DRY_RUN=1` (default): don't submit any tx, log planned calls.**
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
