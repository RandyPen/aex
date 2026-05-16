# polygon-polymarket-prod

Live deployment of the [`polymarket-agent`](../../agents/polymarket-agent/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/polymarket-agent/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/polygon-polymarket/` |
| systemd unit | `polymarket.service` (managed by `agents` user) |
| Tailer service | `polymarket-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0x62E98D3adEbbb815de5e9111389e7173E44c1940` (WaaP, company-owned, `webmaster+polymarket-agent@holonym.id`) |
| Chain | Polygon (chainId `137`) |
| Asset | USDC — `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Strategy | Prediction market trading, $5 max per order |
| First deployed | Pending wallet funding |

## Operations

```
# Status
ssh agents@88.99.125.107 'sudo systemctl status polymarket --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/polygon-polymarket.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart polymarket'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape.

## Wallet policy — 2FA and daily spend limits

```bash
# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/polygon-polymarket && waap-cli policy set --daily-spend-limit 50'

# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/polygon-polymarket && waap-cli 2fa enable --telegram <chatId>'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/polygon-polymarket.stdout.log` → `polymarket-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
