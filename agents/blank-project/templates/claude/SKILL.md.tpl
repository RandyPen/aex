---
name: {{projectName}}
description: Blank WaaP agent skill — signs a message with the local WaaP wallet
---

# {{projectName}}

A blank WaaP agent skill scaffolded with `create-agent-wallet`. This skill
teaches Claude how to sign messages using the user's local WaaP wallet via
the `waap-cli` tool.

## Prerequisites

- `@human.tech/waap-cli` installed (globally or on PATH)
- A WaaP session — run `waap-cli signup` to create one

## Instructions

When the user asks you to sign a message or check their wallet:

1. Shell out to `waap-cli whoami --json` to get the current wallet address.
2. If the user provides a message, hex-encode it and run:
   `waap-cli sign-message --message 0x<hex> --json`
3. Return the signature from the `signature` field.

## Safety rails

- Never read `~/.waap-cli/session.json` directly.
- Never ask the user for their password or email in chat — that's for `waap-cli signup` only.
- If `waap-cli whoami` fails, tell the user to run `waap-cli signup`.

## Recipe reference

{{recipeUrl}}
