# polygon-polymarket-arb-prod

Live deployment of the [`polymarket-arbitrage`](../../agents/polymarket-arbitrage/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/polymarket-arbitrage/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/polygon-polymarket-arb/` |
| systemd unit | `polymarket-arb.service` (managed by `agents` user) |
| Tailer service | `polymarket-arb-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0xF65c65E4170141a7deC990Ae3640B96f2592F617` (WaaP, company-owned) |
| Chain | Polygon (chainId `137`) |
| Strategy | Polymarket cross-market arbitrage trading |
| First deployed | Pending |

## Operations

```bash
# Status
ssh agents@88.99.125.107 'sudo systemctl status polymarket-arb --no-pager'

# Live tail
ssh agents@88.99.125.107 'tail -f /home/agents/logs/polygon-polymarket-arb.stdout.log'

# Restart
ssh agents@88.99.125.107 'sudo systemctl restart polymarket-arb'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/polymarket-arbitrage/templates/standalone/dot-env.example) with the Polygon-specific addresses pre-filled.

## Wallet policy — 2FA and daily spend limits

```bash
# Telegram 2FA
ssh agents@88.99.125.107 'cd /home/agents/polygon-polymarket-arb && waap-cli 2fa enable --telegram <chatId>'

# Daily USD spend limit
ssh agents@88.99.125.107 'cd /home/agents/polygon-polymarket-arb && waap-cli policy set --daily-spend-limit 50'
```

## Telemetry

Events flow: agent stdout → `/home/agents/logs/polygon-polymarket-arb.stdout.log` → `polymarket-arb-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
