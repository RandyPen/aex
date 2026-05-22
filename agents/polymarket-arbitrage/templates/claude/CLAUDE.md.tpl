# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

This is an arbitrage skill. It scans Polymarket for price discrepancies and
places both legs of a hedged trade to capture a guaranteed spread.

## Commands

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data '<json>' --json`
- Standard HTTP to `POLYMARKET_API_URL` (CLOB) and the Gamma API

## Arbitrage logic

- **Complementary arb**: within a single market, YES + NO prices should sum to
  1.0. If sum > 1.0 sell both; if sum < 1.0 buy both.
- **Related-market arb**: within an event with multiple markets, opposing
  outcomes should have implied probabilities that sum to 1.0. Flag pairs that
  deviate.
- Subtract estimated fees (~2% round-trip per leg) from the raw spread before
  comparing against `MIN_SPREAD_BPS`.

## Hard limits

- `AGENT_MAX_ORDER_USD` env var must be set. Refuse any leg above it.
- Only Polygon (chain id 137) is supported in this template.
- Both legs are placed back-to-back to minimize leg risk. If leg A fills and
  leg B fails, surface a warning for manual review — never leave it silent.

## Extending

- `MIN_SPREAD_BPS` controls the minimum post-fee spread that triggers a trade.
- Add `AGENT_AUTO_MODE=1` to skip user confirmation per-trade (dangerous — use
  only in trusted envs).

## Recipe

{{recipeUrl}}
