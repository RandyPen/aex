# Project context for Claude Code — {{projectName}}

This project is a blank WaaP agent skill ({{projectName}}) scaffolded with
`@human.tech/create-agent-wallet`.

**Activity:** {{activityName}}
**Chain:** {{chainName}}
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

## Commands Claude can invoke

- `waap-cli whoami --json` — current wallet address
- `waap-cli sign-message --message 0x... --json` — sign a hex-encoded message
- `waap-cli send-tx --to 0x... --value <eth> --chain-id <id> --json` — send a transaction

## Extending this skill

1. Edit `SKILL.md` to describe new agent behaviors.
2. Add tool invocations to the instructions section.
3. Test with Claude Code by re-opening this folder.

## Recipe reference

{{recipeUrl}}
