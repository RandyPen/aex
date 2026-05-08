---
name: {{projectName}}
description: Blank WaaP agent skill — signs a message with the local WaaP wallet via the waap-cli tool. Use when the user asks to check their WaaP wallet or sign a message.
compatibility: Requires @human.tech/waap-cli on PATH and an active WaaP session at ~/.waap-cli/session.json
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
---

# {{projectName}}

Blank WaaP agent skill scaffolded with `@human.tech/create-agent-wallet`.
Signs an example message using the local WaaP wallet via `waap-cli`.

## Tools this skill shells out to

- `waap-cli whoami --json` — returns `{ address, email? }`
- `waap-cli sign-message --message 0x<hex> --json` — returns `{ signature }`

## Instructions

When the user asks to sign a message:

1. Call `waap-cli whoami --json` to confirm the wallet is available.
2. Hex-encode the user's message (UTF-8 → `0x`-prefixed hex).
3. Call `waap-cli sign-message --message 0x<hex> --json`.
4. Return the `signature` field.

## Safety rails

- Refuse if `waap-cli whoami` fails; tell the user to run `waap-cli signup`.
- Never read `~/.waap-cli/session.json` directly.
- Never ask the user for their password in chat.

## Recipe reference

{{recipeUrl}}
