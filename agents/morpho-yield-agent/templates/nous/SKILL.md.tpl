---
name: {{projectName}}
description: Find the best-APY Morpho Blue vault for a given asset and rebalance into it. Queries blue-api.morpho.org, checks positions, approves + deposits or withdraws + redeposits when a better vault opens. Use when the user asks about yield optimization or stablecoin yield.
compatibility: Requires @human.tech/waap-cli, Ethereum RPC, AGENT_ASSET + AGENT_MAX_DEPOSIT_USD env vars
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: {{chainName}}
  chainId: "{{chainId}}"
---

# {{projectName}} — Morpho Yield (Hermes)

Hermes Agent skill for Morpho Blue vault management on chain {{chainId}}.

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <addr> --value 0 --data <hex> --chain-id {{chainId}} --json`
- HTTP POST `https://blue-api.morpho.org/graphql`
- On-chain reads (viem / eth_call) for `allowance`, `balanceOf`, `convertToAssets`, `decimals`

## Strategy (decimal APY)

1. Query vaults for `AGENT_ASSET` on chain {{chainId}}.
2. Sort by `state.netApy`; winner = max.
3. If no current position: `approve + deposit` into winner (capped).
4. If position elsewhere & `bestApy − heldApy ≥ AGENT_MIN_APY_DELTA_BPS`: withdraw → redeposit.
5. Otherwise: hold.

## Hard rules

- Total deposit across all vaults ≤ `AGENT_MAX_DEPOSIT_USD`.
- Bounded approvals only.
- `AGENT_DRY_RUN=1` default — don't submit, just log.
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
