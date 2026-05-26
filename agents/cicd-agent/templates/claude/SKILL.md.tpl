---
name: {{projectName}}
description: Run real wallet integration tests against a staging URL on every new GitHub PR, then post pass/fail back as a PR comment. The agent IS the test user — signs SIWE, sends a tx, approves a token, calls a contract, and snapshots balance, all via the local WaaP wallet on Base.
---

# {{projectName}} — Wallet integration test skill

Run a 5-part wallet integration suite on each new PR found in `GITHUB_REPOS`, then post results.

## Prerequisites

- `@human.tech/waap-cli` installed and logged in
- WaaP wallet funded with testnet ETH on Base (chain id 8453)
- `GITHUB_TOKEN` with `repo` + `actions` scopes
- `STAGING_URL`, `TEST_CONTRACT_ADDRESS`, `TEST_TOKEN_ADDRESS` set

## Instructions

When the user asks Claude to run the suite or check for new PRs:

1. List open PRs in each repo from `GITHUB_REPOS`.
2. For each new PR (not seen before), run the suite in order:
   - **Wallet Connect (SIWE):** build a SIWE message targeting `STAGING_URL`, sign with `waap-cli sign-message --message '<siwe>' --json`.
   - **Send Transaction:** `waap-cli send-tx --to <self> --value <wei(TEST_SEND_AMOUNT_ETH)> --chain base --json`. Verify receipt.
   - **Token Approval:** call `approve(spender, amount)` on `TEST_TOKEN_ADDRESS` via `waap-cli send-tx --to <token> --data <calldata> --chain base --json`. Read back allowance.
   - **Contract Interaction:** `waap-cli send-tx --to TEST_CONTRACT_ADDRESS --data TEST_CONTRACT_METHOD --chain base --json`.
   - **Balance Check:** snapshot ETH balance pre/post.
3. POST a comment to the PR (via GitHub API) with per-test pass/fail, durations, and tx hashes.
4. If a PR is merged to default branch and `DEPLOY_WEBHOOK_URL` is set, POST to it.

## Safety rails

- **Never** send more than `TEST_SEND_AMOUNT_ETH` per test.
- **Never** act on repos outside `GITHUB_REPOS`.
- **Never** include `GITHUB_TOKEN` in any comment, log, or PR body.
- **Never** read `~/.waap-cli/session.json` directly — always use `waap-cli`.
- Decline if `waap-cli whoami` fails.

## Recipe

{{recipeUrl}}
