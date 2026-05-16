# base-recurring-payments-prod

Live deployment of the [`recurring-payments`](../../agents/recurring-payments/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/recurring-payments/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/base-recurring-payments/` |
| systemd unit | `recurring-payments.service` (managed by `agents` user) |
| Tailer service | `recurring-payments-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0xa16094B83B2da2779F9583aa796576B10a5EBa0d` (WaaP, company-owned) |
| Chain | Base (chainId `8453`) |
| Strategy | Scheduled recurring token payments |
| First deployed | Pending |

## Operations

```bash
# Status
ssh agents@88.99.125.107 'sudo systemctl status recurring-payments --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/base-recurring-payments.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart recurring-payments'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/recurring-payments/templates/standalone/dot-env.example) with the Base-specific values pre-filled.

## Wallet policy — 2FA and daily spend limits

```bash
# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/base-recurring-payments && waap-cli 2fa enable --telegram <chatId>'

# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/base-recurring-payments && waap-cli policy set --daily-spend-limit 500'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/base-recurring-payments.stdout.log` → `recurring-payments-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
