---
name: {{projectName}}
description: Run scheduled ERC-20 and native token payments on EVM chains from a JSON config. Tracks history to avoid double-payments, supports per-payment chain overrides, honors a dry-run mode. Use when the user asks to run payroll, subscriptions, scheduled donations, or any time-based payment.
compatibility: Requires @human.tech/waap-cli, native + token balance on referenced chains, and a payments JSON file
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Recurring payments

Skill for any AgentSkills-compatible runtime. Reads a JSON schedule, builds
native or ERC-20 transfers, and submits them via `waap-cli send-tx`.

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <recipient> --value <wei> --chain <chain> --json`
- `waap-cli send-tx --to <token> --data <calldata> --chain <chain> --json`
- Filesystem: read `PAYMENT_CONFIG_PATH`, read/write `PAYMENT_HISTORY_PATH`

## Strategy

1. Load `PAYMENT_CONFIG_PATH` and `PAYMENT_HISTORY_PATH` each tick.
2. For each `enabled` entry, evaluate `now - lastPaid[label] >= intervalMs`.
3. Build native (`value`) or ERC-20 (`transfer(...)` calldata) tx.
4. Submit via `waap-cli send-tx`, using `chainId` per entry or `DEFAULT_CHAIN_ID`.
5. Persist tx hash and `lastPaid` keyed by `label`.

## Safety rails

- **Never** pay an address not in the config.
- **Never** double-pay.
- Honor `AGENT_DRY_RUN=1`.
- Skip entries with `enabled === false`.

## Production note

Pair this with a WaaP Privilege policy that scopes allowed recipients, token
addresses, max amount, and chain IDs so on-policy payments don't require
manual approval.

## Recipe reference

{{recipeUrl}}
