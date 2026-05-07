# sui-cetus-yield-prod

Live deployment of the [`cetus-yield-agent`](../../agents/cetus-yield-agent/) template, running on the company `aex` host (Hetzner CPX32, Falkenstein).

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/cetus-yield-agent/templates/standalone/` |
| Host | `aex` (`88.99.125.107` — holonym-ops Hetzner project) |
| Path on host | `/home/agents/sui-cetus-yield/` |
| systemd unit | `cetus-yield.service` (managed by `agents` user) |
| Tailer service | `cetus-yield-tailer.service` (ferries log events to the dashboard via `/api/ingest`) |
| Wallet | `0x41bc2d53b278911e32c3323b9ecf45c3c3318eb2bd73086825952e0c3a9db604` (WaaP, company-owned, `webmaster+sui-cetus-yield@holonym.id`) |
| Pool | `0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105` (SUI/USDC CLMM, mainnet) |
| Mode | `active` |
| First deployed | 2026-05-07 03:04 UTC |

## Operations

```
# Status
ssh aex 'sudo systemctl status cetus-yield --no-pager'

# Live tail
ssh aex 'tail -f /home/agents/logs/cetus-yield.stdout.log'

# Restart
ssh aex 'sudo systemctl restart cetus-yield'

# Switch mode (edit .env, then restart)
ssh aex 'cd /home/agents/sui-cetus-yield && sudo sed -i "s/AGENT_MODE=.*/AGENT_MODE=monitor/" .env && sudo systemctl restart cetus-yield'
```

## .env contents

Real `.env` values stay on the host (never in git). See [`.env.example`](./.env.example) for the shape — same as the template's [`dot-env.example`](../../agents/cetus-yield-agent/templates/standalone/dot-env.example).

## Telemetry

Events flow: agent stdout → `/home/agents/logs/cetus-yield.stdout.log` → `cetus-yield-tailer.service` → `https://aex-agents.vercel.app/api/ingest` → Neon Postgres → `/api/agent` → [aex-agents.vercel.app](https://aex-agents.vercel.app/) dashboard.

## Deploy script

See [`deploy.sh`](./deploy.sh) — re-runs the canonical deployment from this repo's template onto `aex`. Idempotent.
