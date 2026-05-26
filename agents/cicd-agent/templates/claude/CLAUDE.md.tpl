# Project context for Claude Code

**Activity:** {{activityName}}
**Chain:** {{chainName}} (id {{chainId}})
**Wallet:** {{walletAddress}}

## What this skill does

{{activityDescription}}

The agent IS the test user. It monitors GitHub for new PRs, then runs a real
wallet integration test suite against a staging URL using its own WaaP wallet
(SIWE sign-in, send transaction, ERC-20 approve, contract call, balance check),
and posts the results back as a PR comment. On merge to main, it fires a
deploy webhook.

## Commands

- `waap-cli whoami --json`
- `waap-cli sign-message --message '<siwe>' --json`
- `waap-cli send-tx --to <addr> --value <wei> --chain base --json`
- `waap-cli send-tx --to <token> --data <calldata> --chain base --json`
- GitHub REST via `GITHUB_TOKEN` (list PRs, post comments, dispatch workflows)

## Hard limits

- Chain is fixed to Base (id 8453). Use `--chain base` on `send-tx`.
- Only act on PRs in `GITHUB_REPOS`. Never touch other repos.
- `TEST_SEND_AMOUNT_ETH` is the per-test sending cap — refuse to send more.
- Never expose `GITHUB_TOKEN` in PR comments or logs.

## Extending

- Add more test cases by appending to the test runner — keep each one isolated.
- Use `DEPLOY_WEBHOOK_URL` to chain to Vercel/Render deploys on merge.
- Set `AGENT_DRY_RUN=1` (if you wire it up) to log intents without sending tx.

## Recipe

{{recipeUrl}}
