---
name: {{projectName}}
description: Run real wallet integration tests against a staging URL for every new GitHub PR. Signs SIWE, sends a tx, approves a token, calls a contract, snapshots balance — all using the local WaaP wallet on Base — then posts pass/fail back as a PR comment. Use when the user asks to run wallet tests, check open PRs, or verify a staging deploy.
compatibility: Requires @human.tech/waap-cli, testnet ETH on Base in the agent wallet, and a GitHub token with repo + actions scopes
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: openclaw
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Wallet integration testing

Skill for any AgentSkills-compatible runtime (Hermes / OpenClaw / Claude Code).
The agent IS the test user — it signs and sends real transactions on Base from
the local WaaP wallet.

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-message --message <siwe> --json`
- `waap-cli send-tx --to <addr> --value <wei> --chain base --json`
- `waap-cli send-tx --to <addr> --data <calldata> --chain base --json`
- HTTP to `https://api.github.com` with `Authorization: Bearer ${GITHUB_TOKEN}`

## Strategy

1. For each repo in `GITHUB_REPOS`, list open PRs.
2. For each new PR, dispatch `CI_WORKFLOW_ID` and run the 5-part suite:
   1. SIWE sign-in against `STAGING_URL`
   2. Send a small self-tx of `TEST_SEND_AMOUNT_ETH`
   3. `approve()` on `TEST_TOKEN_ADDRESS` and verify the allowance
   4. Contract call to `TEST_CONTRACT_ADDRESS` with `TEST_CONTRACT_METHOD` calldata
   5. Balance snapshot (pre/post) on the agent wallet
3. Post results as a PR comment with pass/fail + tx hashes.
4. On merge to default branch, POST to `DEPLOY_WEBHOOK_URL` if set.

## Safety rails

- **Never** exceed `TEST_SEND_AMOUNT_ETH` per test.
- **Never** touch repos outside `GITHUB_REPOS`.
- **Never** include `GITHUB_TOKEN` in comments or logs.
- Decline if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
