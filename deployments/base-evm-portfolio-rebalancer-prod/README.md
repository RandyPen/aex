# base-evm-portfolio-rebalancer-prod

Live deployment of the [`evm-portfolio-rebalancer`](../../agents/evm-portfolio-rebalancer/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/evm-portfolio-rebalancer/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/base-portfolio-rebalancer/` |
| systemd unit | `evm-portfolio-rebalancer.service` (managed by `agents` user) |
| Tailer service | `evm-portfolio-rebalancer-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0xa543197A1cf404115D350Fee6b785ad169387D35` (WaaP, company-owned) |
| Chain | Base (chainId `8453`) |
| Strategy | EVM portfolio rebalancing via Uniswap V3 |
| First deployed | Pending |

## Operations

```bash
# Status
ssh agents@88.99.125.107 'sudo systemctl status evm-portfolio-rebalancer --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/base-portfolio-rebalancer.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart evm-portfolio-rebalancer'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/evm-portfolio-rebalancer/templates/standalone/dot-env.example) with the Base-specific addresses pre-filled.

## Wallet policy — 2FA and daily spend limits

```bash
# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/base-portfolio-rebalancer && waap-cli 2fa enable --telegram <chatId>'

# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/base-portfolio-rebalancer && waap-cli policy set --daily-spend-limit 500'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/base-portfolio-rebalancer.stdout.log` → `evm-portfolio-rebalancer-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
