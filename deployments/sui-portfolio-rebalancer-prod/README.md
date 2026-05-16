# sui-portfolio-rebalancer-prod

Live deployment of the [`sui-portfolio-rebalancer`](../../agents/sui-portfolio-rebalancer/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/sui-portfolio-rebalancer/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/sui-portfolio-rebalancer/` |
| systemd unit | `sui-portfolio-rebalancer.service` (managed by `agents` user) |
| Tailer service | `sui-portfolio-rebalancer-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | TBD (Sui wallet address pending from signup) |
| Chain | Sui mainnet |
| Strategy | Sui portfolio rebalancing via Cetus DEX |
| First deployed | Pending |

## Operations

```bash
# Status
ssh agents@88.99.125.107 'sudo systemctl status sui-portfolio-rebalancer --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/sui-portfolio-rebalancer.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart sui-portfolio-rebalancer'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/sui-portfolio-rebalancer/templates/standalone/dot-env.example) with the Sui mainnet defaults pre-filled.

## Wallet policy — 2FA and daily spend limits

```bash
# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/sui-portfolio-rebalancer && waap-cli 2fa enable --telegram <chatId>'

# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/sui-portfolio-rebalancer && waap-cli policy set --daily-spend-limit 500'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/sui-portfolio-rebalancer.stdout.log` → `sui-portfolio-rebalancer-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
