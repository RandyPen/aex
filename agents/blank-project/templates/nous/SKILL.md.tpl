---
name: {{projectName}}
description: Blank WaaP agent skill — signs a message with the local WaaP wallet via the waap-cli tool. Use when the user asks to check their WaaP wallet or sign a message.
compatibility: Requires @human.tech/waap-cli on PATH and an active WaaP session at ~/.waap-cli/session.json
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
---

# {{projectName}}

Blank WaaP agent skill for Hermes Agent (Nous Research). Loads as a
standard AgentSkills skill — signs an example message via `waap-cli`.

## Tools this skill shells out to

- `waap-cli whoami --json`
- `waap-cli sign-message --message 0x<hex> --json`

## Instructions

1. Call `waap-cli whoami --json` and report the address.
2. On user request, hex-encode their message and call
   `waap-cli sign-message --message 0x<hex> --json`.
3. Return the `signature`.

## Safety rails

- Refuse if `waap-cli whoami` errors; instruct user to run `waap-cli signup`.
- Never read session files directly.

## Recipe reference

{{recipeUrl}}
