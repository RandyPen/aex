---
name: {{projectName}}
description: Run real wallet integration tests against a staging URL for every new GitHub PR. Signs SIWE, sends a tx, approves a token, calls a contract, snapshots balance — all using the local WaaP wallet on Base — then posts pass/fail back as a PR comment. Use when the user asks to run wallet tests, check open PRs, or verify a staging deploy.
compatibility: Requires @human.tech/waap-cli, testnet ETH on Base in the agent wallet, and a GitHub token with repo + actions scopes
metadata:
  author: holonym-foundation
  activity: {{activitySlug}}
  runtime: hermes
  chain: base
  chainId: "{{chainId}}"
---

# {{projectName}} — Wallet integration testing (Hermes)

## Tools

- `waap-cli whoami --json`
- `waap-cli sign-message --message <siwe> --json`
- `waap-cli send-tx --to <addr> --value <wei> --chain base --json`
- `waap-cli send-tx --to <addr> --data <calldata> --chain base --json`
- HTTP to `https://api.github.com` with `Authorization: Bearer ${GITHUB_TOKEN}`

## Strategy

1. Poll `GET /repos/{owner}/{repo}/pulls?state=open` for each repo in `GITHUB_REPOS`.
2. For each new PR:
   - Dispatch the workflow `CI_WORKFLOW_ID` via `POST /repos/{o}/{r}/actions/workflows/{id}/dispatches`.
   - Run the suite (SIWE sign-in, self-tx, ERC-20 approve, contract call, balance check).
   - Post the result as a PR comment via `POST /repos/{o}/{r}/issues/{n}/comments`.
3. On detected merge to default branch, fire `DEPLOY_WEBHOOK_URL` if set.

## Hard rules

- Never send more than `TEST_SEND_AMOUNT_ETH` per test.
- Never act on repos outside `GITHUB_REPOS`.
- Never leak `GITHUB_TOKEN` in comments or logs.
- Refuse if `waap-cli whoami` fails.

## Recipe reference

{{recipeUrl}}
