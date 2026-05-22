# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

This is an LLM-driven analyst skill. It sends each Polymarket question (with
price/volume context) to an LLM, which returns a side (YES/NO), a confidence
score (0–1) and reasoning. Bets are placed only when confidence clears the
threshold.

## Commands

- `waap-cli whoami --json`
- `waap-cli sign-typed-data --data '<json>' --json`
- Standard HTTP to `POLYMARKET_API_URL` (CLOB) and the Gamma API
- HTTP to the configured LLM provider (Anthropic or OpenAI)

## Analysis loop

1. Fetch active markets from the Gamma API.
2. For each market, ask the LLM for `{ side, confidence, reasoning }`.
3. Skip any market where `confidence < CONFIDENCE_THRESHOLD` (default 0.7).
4. For markets that clear the bar, buy the LLM-chosen side and submit to the CLOB.

## Hard limits

- `AGENT_MAX_ORDER_USD` env var must be set. Refuse orders above it.
- `LLM_PROVIDER` must be `anthropic` or `openai`; `LLM_API_KEY` must be set.
- Only Polygon (chain id 137) is supported in this template.

## Extending

- `CONFIDENCE_THRESHOLD` tunes how selective the agent is.
- `LLM_DELAY_MS` rate-limits LLM calls.
- Add `AGENT_AUTO_MODE=1` to skip user confirmation per-order (dangerous — use
  only in trusted envs).

## Recipe

{{recipeUrl}}
