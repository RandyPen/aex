# Wallet Integration Test Agent

An autonomous agent that runs real wallet integration tests against staging environments on every pull request. The agent IS the test user — it connects its own WaaP wallet, signs SIWE messages, sends testnet transactions, approves tokens, and calls contracts. Results are posted as PR comments so reviewers see wallet-level pass/fail before merging.

Runs on Base (chain ID 8453).

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## What It Does

- **Detects new PRs** by polling GitHub repositories
- **Runs a five-part wallet integration test suite** using its own WaaP wallet against your staging URL:
  1. **Wallet Connect** — Signs a SIWE (Sign-In with Ethereum) message to verify auth works
  2. **Send Transaction** — Sends a small testnet transaction to itself, verifies receipt
  3. **Token Approval** — Approves a token spend via ERC-20 `approve()`, verifies the allowance
  4. **Contract Interaction** — Calls a configurable contract method, verifies the transaction
  5. **Balance Check** — Snapshots balance before and after to confirm no unexpected drains
- **Posts test results as a PR comment** with pass/fail per test, durations, and details
- **Triggers CI** by dispatching a GitHub Actions workflow when a new PR is detected
- **Triggers deployment** via webhook when a PR merges to main/master
- **Posts failure comments** on PRs when their associated CI runs fail
- **Logs everything** as structured JSON lines compatible with the AEX dashboard

## Configuration

Copy `templates/standalone/dot-env.example` to `.env` and fill in the values.

### Required

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub personal access token. Needs `repo` and `actions` scopes. |
| `GITHUB_REPOS` | Comma-separated list of repositories to monitor (e.g. `org/repo1,org/repo2`). |
| `STAGING_URL` | Base URL of the staging/preview environment to test against. |
| `TEST_CONTRACT_ADDRESS` | Address of the contract to call during contract interaction tests. |
| `TEST_TOKEN_ADDRESS` | ERC-20 token address used for approval tests. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `POLL_INTERVAL_MS` | `30000` | Milliseconds between polling cycles. |
| `AGENT_LOG_FILE` | `./logs/cicd-agent.jsonl` | Path for structured log output. |
| `DEPLOY_WEBHOOK_URL` | -- | Webhook URL to POST when a merge to main/master is detected. |
| `CI_WORKFLOW_ID` | `ci.yml` | GitHub Actions workflow filename or ID to dispatch on new PRs. |
| `TEST_SEND_AMOUNT_ETH` | `0.0001` | ETH amount to send in the transaction test (sent to self). |
| `TEST_CONTRACT_METHOD` | `0x` | Hex-encoded calldata for the contract interaction test. |

## Prerequisites

1. **WaaP CLI** installed and authenticated (`waap-cli signup` / `waap-cli login`)
2. **Node.js 20+**
3. A GitHub personal access token with `repo` and `actions` scopes
4. A staging or preview environment URL
5. A testnet contract and ERC-20 token deployed on your target chain
6. Testnet ETH in the agent's wallet (fund the address from `waap-cli whoami`)

## Setup

```bash
# From the generated project directory
npm install

# Copy and edit environment variables
cp dot-env.example .env

# Run in development mode
npm run dev

# Run in production
npm start
```

## Test Suite Details

### Wallet Connect (SIWE)

The agent constructs a Sign-In with Ethereum message targeting the staging URL and signs it with `waap-cli sign-message`. This proves the wallet can authenticate with the application. If this test fails, login is broken.

### Send Transaction

The agent sends a small ETH amount to itself using `waap-cli send-tx`. This validates the full transaction lifecycle: signing, broadcasting, and receipt confirmation. The amount is configurable via `TEST_SEND_AMOUNT_ETH`.

### Token Approval

The agent calls `approve()` on the configured ERC-20 token, then reads back the allowance to confirm. This covers the common DeFi pattern where a user approves a contract to spend tokens on their behalf.

### Contract Interaction

The agent sends a transaction to `TEST_CONTRACT_ADDRESS` with the calldata in `TEST_CONTRACT_METHOD`. Use this to test any contract method your application depends on — a swap, a mint, a stake, etc.

### Balance Check

After all other tests, the agent snapshots its wallet balance. Compare against the initial balance to verify that only expected amounts were spent. Large unexpected drops indicate a bug or misconfigured contract.

## PR Comment Format

The agent posts a comment on each new PR with results like:

```
Wallet Integration Tests: PASSED (5/5)

Test results:

  PASS: Wallet Connect (SIWE) (1204ms)
        Signed SIWE message, signature: 0x3a4b5c6d7e8f...
  PASS: Send Transaction (3412ms)
        Sent 0.0001 ETH to self, tx: 0x1234abcd5678...
  PASS: Token Approval (2891ms)
        Approval tx: 0xabcd1234efgh..., allowance confirmed: returned
  PASS: Contract Interaction (2103ms)
        Contract call tx: 0x5678efgh9012...
  PASS: Balance Check (156ms)
        Post-test balance: 0.0492 (verify no unexpected drains)

Staging URL: https://staging.myapp.xyz
Chain ID: 8453
Agent: my-test-agent
```

## Log Events

All events are written as JSON lines to stdout and the configured log file.

| Event | Description |
|---|---|
| `agent_start` | Agent initialization, wallet address, config summary |
| `repo_poll` | Start of a polling cycle for a repo |
| `pr_detected` | New open PR found |
| `ci_triggered` | CI workflow dispatch attempted |
| `test_suite_start` | Wallet integration test suite started for a PR |
| `test_passed` | Individual test passed |
| `test_failed` | Individual test failed |
| `test_suite_complete` | All tests finished, summary counts |
| `test_results_posted` | Test results comment posted on PR |
| `merge_detected` | PR merged to main/master |
| `deploy_triggered` | Deployment webhook fired |
| `deploy_complete` | Deployment webhook returned success |
| `deploy_failed` | Deployment webhook returned error |
| `pr_comment_posted` | CI failure comment posted on a PR |
| `balance_snapshot` | Periodic wallet balance check |
| `tick_error` | Unhandled error during a polling cycle |

## Startup Behavior

On first launch, the agent seeds its internal state with the current open PRs, recent merges, and failed runs. This prevents it from re-triggering tests or deployments for already-existing items. Only new activity after startup is acted on.
