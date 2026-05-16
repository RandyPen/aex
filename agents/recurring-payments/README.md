# Recurring Payments Agent

Automate recurring ERC-20 and native token payments on any EVM chain. Built on WaaP CLI (Wallet-as-a-Protocol) for non-custodial key management via 2-party computation (2PC).

Use cases: subscription payments, salary and payroll, recurring donations, DAO contributor payments, protocol fee distribution.

## How It Works

1. The agent reads a payment config JSON file that defines a list of scheduled payments.
2. On each tick (default: every 60 seconds), it checks which payments are due based on the last payment timestamp and the configured interval.
3. Due payments are submitted on-chain via `waap-cli send-tx`.
4. Payment history is persisted to a local JSON file so the agent can resume after restarts.

## Payment Config Format

Create a JSON file (e.g. `payments.json`) with an array of payment definitions:

```json
[
  {
    "recipient": "0xAbC123...",
    "tokenAddress": "native",
    "amount": "0.01",
    "decimals": 18,
    "intervalMs": 2592000000,
    "label": "Monthly server costs"
  },
  {
    "recipient": "0xDeF456...",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "3000",
    "decimals": 6,
    "intervalMs": 2592000000,
    "label": "Monthly salary - Alice",
    "chainId": 8453
  },
  {
    "recipient": "0x789Abc...",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "50",
    "decimals": 6,
    "intervalMs": 604800000,
    "label": "Weekly donation - Protocol Guild",
    "enabled": true
  }
]
```

### Field Reference

| Field          | Required | Description                                                                 |
|----------------|----------|-----------------------------------------------------------------------------|
| `recipient`    | Yes      | Destination wallet address                                                  |
| `tokenAddress` | No       | ERC-20 contract address, or `"native"` for ETH/native token (default: `"native"`) |
| `amount`       | Yes      | Human-readable amount (e.g. `"100.5"` for 100.5 USDC)                      |
| `decimals`     | No       | Token decimals -- 18 for ETH, 6 for USDC, etc. (default: 18)               |
| `intervalMs`   | Yes      | Milliseconds between payments                                               |
| `label`        | Yes      | Unique human-readable label (used as the key for tracking payment history)  |
| `chainId`      | No       | Per-payment chain override (default: `DEFAULT_CHAIN_ID` env var or 8453)    |
| `enabled`      | No       | Set to `false` to pause a payment without removing it (default: `true`)     |

### Common Intervals

| Interval   | Milliseconds    |
|------------|-----------------|
| Hourly     | `3600000`       |
| Daily      | `86400000`      |
| Weekly     | `604800000`     |
| Biweekly   | `1209600000`    |
| Monthly    | `2592000000`    |

## Setup

1. Scaffold the project:

```bash
npx @human.tech/create-agent-wallet recurring-payments
```

2. Create your payment config file (see format above):

```bash
cp payments.example.json payments.json
# Edit payments.json with your payment schedules
```

3. Configure environment variables:

```bash
cp .env.example .env
# Set PAYMENT_CONFIG_PATH=./payments.json
```

4. Run the agent:

```bash
npm run dev
```

## Environment Variables

| Variable                | Required | Default                              | Description                                      |
|-------------------------|----------|--------------------------------------|--------------------------------------------------|
| `PAYMENT_CONFIG_PATH`   | Yes      | --                                   | Path to the payment schedule JSON file           |
| `DEFAULT_CHAIN_ID`      | No       | `8453`                               | Default EVM chain ID (Base)                      |
| `AGENT_POLL_INTERVAL_MS`| No       | `60000`                              | Milliseconds between payment-due checks          |
| `PAYMENT_HISTORY_PATH`  | No       | `./data/payment-history.json`        | Where payment history is persisted               |
| `AGENT_LOG_FILE`        | No       | `./logs/recurring-payments.jsonl`    | Structured log output (JSONL)                    |
| `AGENT_DRY_RUN`         | No       | `0`                                  | Set to `1` to log without sending transactions   |

## Privileges (Auto-Approved Payments)

WaaP Privileges allow the agent to send transactions within a defined scope without requiring manual approval for each one. Configure a Privilege policy that covers:

- Allowed recipient addresses
- Maximum amount per transaction
- Token contract addresses
- Chain IDs

This ensures the agent can only send payments matching the approved policy. Any transaction outside the Privilege scope will require manual approval via the WaaP dashboard.

## Structured Logging

The agent emits JSON log lines (one per line) to both stdout and the configured log file. Each entry includes:

- `ts` -- ISO 8601 timestamp
- `agent` -- agent identifier
- `level` -- `info`, `warn`, or `error`
- `message` -- event type

Event types: `agent_start`, `config_loaded`, `balance_snapshot`, `payment_due`, `payment_sent`, `payment_failed`, `payment_skipped_dry_run`, `tick_error`.

Logs are compatible with AEX dashboard ingest.

## Payment History

The agent persists a `payment-history.json` file tracking:

- Every payment attempt (sent or failed) with transaction hash, timestamp, and status
- A `lastPaidMap` keyed by payment label, used to determine when the next payment is due

The agent resumes correctly after restarts -- it will not double-pay for a period that was already covered.
