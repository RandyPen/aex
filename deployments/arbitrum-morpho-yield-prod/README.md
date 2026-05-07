# arbitrum-morpho-yield-prod

Live deployment of the [`morpho-yield-agent`](../../agents/morpho-yield-agent/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/morpho-yield-agent/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/arbitrum-morpho-yield/` |
| systemd unit | `morpho-yield.service` (managed by `agents` user) |
| Tailer service | `morpho-yield-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0x24049951b0f2Df207F6b16d982072AF7CfAEd5f1` (WaaP, company-owned, `webmaster+arbitrum-morpho-yield@holonym.id`) |
| Chain | Arbitrum One (chainId `42161`) |
| Asset | USDC native — `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Strategy | Multi-vault portfolio (top 3, equal weight) + Aave V3 idle floor + Morpho rewards claiming |
| First deployed | 2026-05-07 |

## Operations

```bash
# Status
ssh aex 'sudo systemctl status morpho-yield --no-pager'

# Live tail
ssh aex 'tail -f /home/agents/logs/morpho-yield.stdout.log'

# Restart
ssh aex 'sudo systemctl restart morpho-yield'

# Toggle dry-run (edit .env, then restart)
ssh aex 'cd /home/agents/arbitrum-morpho-yield && sudo sed -i "s/AGENT_DRY_RUN=.*/AGENT_DRY_RUN=0/" .env && sudo systemctl restart morpho-yield'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/morpho-yield-agent/templates/standalone/dot-env.example) with the Arbitrum-specific addresses pre-filled.

## Telemetry

Events flow: agent stdout → `/home/agents/logs/morpho-yield.stdout.log` → `morpho-yield-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → `/api/agent` → [aex-agents.vercel.app/arbitrum-morpho-yield](https://aex-agents.vercel.app/arbitrum-morpho-yield) dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent; preserves the host's `.env`.
