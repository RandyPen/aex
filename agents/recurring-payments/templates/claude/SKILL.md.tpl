---
name: {{projectName}}
description: Automate recurring ERC-20 and native token payments on EVM chains. Reads a JSON schedule, checks due dates, and submits transactions via the local WaaP wallet. Use when the user asks to run payroll, subscriptions, scheduled donations, or any time-based payment.
---

# {{projectName}} — Recurring payments skill

## Prerequisites

- `@human.tech/waap-cli` installed and logged in
- Wallet funded with native + token balance on each chain referenced in the config
- A JSON file at `PAYMENT_CONFIG_PATH`

## Payment config schema

Each entry:

```json
{
  "recipient": "0x...",
  "tokenAddress": "native | 0x...",
  "amount": "100.5",
  "decimals": 6,
  "intervalMs": 2592000000,
  "label": "Monthly salary - Alice",
  "chainId": 8453,
  "enabled": true
}
```

## Instructions

When the user asks Claude to run a payment tick:

1. Read `PAYMENT_CONFIG_PATH` and `PAYMENT_HISTORY_PATH`.
2. For each `enabled` entry, check if `now - lastPaid[label] >= intervalMs`.
3. For each due payment:
   - Native: `waap-cli send-tx --to <recipient> --value <wei> --chain <chain> --json`
   - ERC-20: encode `transfer(recipient, amount * 10^decimals)`, `waap-cli send-tx --to <tokenAddress> --data <calldata> --chain <chain> --json`
4. On success, update `PAYMENT_HISTORY_PATH` with the tx hash and `lastPaid` timestamp keyed by `label`.
5. If `AGENT_DRY_RUN=1`, log intent only — do not submit.

## Safety rails

- **Never** send to a recipient not listed in the config.
- **Never** double-pay — always check `lastPaid` before submitting.
- **Never** read `~/.waap-cli/session.json` — go via `waap-cli`.
- Refuse if `waap-cli whoami` fails.
- Skip any entry where `enabled === false`.

## Recipe

{{recipeUrl}}
