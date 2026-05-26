# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

The agent reads a JSON config of scheduled payments, checks which ones are due
based on `intervalMs` and persisted history, then submits ERC-20 transfers or
native sends via `waap-cli send-tx`. Use cases: payroll, subscriptions,
recurring donations, DAO contributor payments.

## Commands

- `waap-cli whoami --json`
- `waap-cli send-tx --to <recipient> --value <wei> --chain <chain> --json` (native)
- `waap-cli send-tx --to <token> --data <transferCalldata> --chain <chain> --json` (ERC-20)

## Hard limits

- Only pay recipients listed in `PAYMENT_CONFIG_PATH`. Refuse any address not in the config.
- Honor `enabled: false` to pause a payment.
- Honor `AGENT_DRY_RUN=1` — log intents, do not submit.
- Track every paid label in `PAYMENT_HISTORY_PATH` to prevent double-payments after restart.

## Extending

- Per-payment `chainId` lets you mix Base, Optimism, etc. in one config.
- Configure a WaaP Privilege policy scoping recipients + max amount so payments
  in the policy go without manual approval.
- Add `enabled: false` to pause without deleting.

## Recipe

{{recipeUrl}}
