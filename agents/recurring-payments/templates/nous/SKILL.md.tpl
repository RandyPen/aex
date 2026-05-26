---
name: {{projectName}}
description: Run scheduled ERC-20 and native token payments on EVM chains from a JSON config. Tracks history to avoid double-payments, supports per-payment chain overrides, honors a dry-run mode. Use when the user asks to run payroll, subscriptions, scheduled donations, or any time-based payment.
compatibility: Requires @human.tech/waap-cli, native + token balance on the chains referenced in the config, and a payments JSON file
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Recurring payments (Hermes)

## Tools

- `waap-cli whoami --json`
- `waap-cli send-tx --to <recipient> --value <wei> --chain <chain> --json` (native)
- `waap-cli send-tx --to <token> --data <transferCalldata> --chain <chain> --json` (ERC-20)
- Filesystem: read `PAYMENT_CONFIG_PATH`, read/write `PAYMENT_HISTORY_PATH`

## Strategy

1. Load `PAYMENT_CONFIG_PATH` and `PAYMENT_HISTORY_PATH` on each tick (`AGENT_POLL_INTERVAL_MS`).
2. For each `enabled` entry, check `now - lastPaid[label] >= intervalMs`.
3. Build the tx:
   - `tokenAddress === "native"`: native send with `value = amount * 10^decimals`.
   - Otherwise: `transfer(recipient, amount * 10^decimals)` calldata to `tokenAddress`.
4. Submit via `waap-cli send-tx`, using `chainId` per entry or falling back to `DEFAULT_CHAIN_ID`.
5. Persist tx hash + `lastPaid` keyed by `label`.

## Hard rules

- Never pay an address not in the config.
- Never double-pay; always check `lastPaid` first.
- Honor `AGENT_DRY_RUN=1` (log intent, no submission).
- Skip entries with `enabled === false`.

## Recipe reference

{{recipeUrl}}
