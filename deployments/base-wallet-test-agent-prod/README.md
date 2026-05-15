# base-wallet-test-agent-prod

Live deployment of the [`cicd-agent`](../../agents/cicd-agent/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/cicd-agent/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/base-wallet-test-agent/` |
| systemd unit | `wallet-test-agent.service` (managed by `agents` user) |
| Tailer service | `wallet-test-agent-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0x1B5Bce84dBd943c21e6a659CE5DeF24Fdae9D72a` (WaaP, company-owned) |
| Chain | Base (chainId `8453`) |
| Strategy | CI/CD wallet integration testing — monitors GitHub repos, runs wallet tests on staging deployments |
| First deployed | Pending |

## Operations

```bash
# Status
ssh agents@88.99.125.107 'sudo systemctl status wallet-test-agent --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/base-wallet-test-agent.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart wallet-test-agent'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/cicd-agent/templates/standalone/dot-env.example) with the Base-specific values pre-filled.

## Wallet policy — 2FA and daily spend limits

```bash
# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/base-wallet-test-agent && waap-cli 2fa enable --telegram <chatId>'

# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/base-wallet-test-agent && waap-cli policy set --daily-spend-limit 50'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/base-wallet-test-agent.stdout.log` → `wallet-test-agent-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
