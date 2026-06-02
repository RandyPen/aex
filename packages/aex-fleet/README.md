# `@human.tech/aex-fleet`

Operator CLI for managing many WaaP agent wallets at once.

> v1 prototype — see tracking issue [`holonym-foundation/internal-docs#1166`](https://github.com/holonym-foundation/internal-docs/issues/1166).

## What it does

Wraps [`@human.tech/waap-cli`](https://www.npmjs.com/package/@human.tech/waap-cli) with a fleet registry so one operator can:

| | |
|---|---|
| `aex-fleet add` | Register an agent in the fleet |
| `aex-fleet ls` | List agents, addresses, balances, tags |
| `aex-fleet use` | Set the active agent for subsequent commands |
| `aex-fleet rm` | Remove an agent from the registry (wallet untouched) |
| `aex-fleet waap …` | Pass through to `waap-cli` scoped to the active agent |
| `aex-fleet exec …` | Run an arbitrary command in the active agent's HOME sandbox |
| `aex-fleet policy get/set` | Inspect / set policy in bulk via `--all`, `--tag`, `--agent` |
| `aex-fleet status` | Aggregate balances, last activity, errors (24h) from Neon |
| `aex-fleet plan` / `aex-fleet apply` | Two-phase bulk ops — preview, then approve |
| `aex-fleet doctor` | Health-check the runtime |

Every read command supports `--json` for AI-shell consumption. Every side-effecting verb supports `--dry-run` (or the `plan`/`apply` flow).

## AI shells drive this natively

The `SKILL.md` at the package root + the `templates/claude-code/CLAUDE.md` project primer let Claude Code (or Cursor / opencode) invoke `aex-fleet` via the shell's native Bash tool. No MCP server required. See [`examples/demo.claude-code.md`](./examples/demo.claude-code.md) for a session transcript.

## Quick start

```bash
# Install
npm install -g @human.tech/aex-fleet @human.tech/waap-cli

# Preflight
aex-fleet doctor

# Onboard
aex-fleet add alpha --chain ethereum --tag yield
aex-fleet add beta --chain ethereum --tag yield

# Bulk policy via plan/apply
aex-fleet plan policy set --tag yield --daily-limit 50 | aex-fleet apply --yes

# Aggregate status (requires AEX_FLEET_NEON_DSN_RO)
aex-fleet status
```

Full end-to-end demo on Sepolia: [`examples/demo.sh`](./examples/demo.sh).

## Config

Data root: `$XDG_CONFIG_HOME/aex-fleet/` (or platform default on macOS / Windows):

```
$AEX_FLEET_HOME/
  fleet.json                                       # registry (mode 0600)
  sessions/<agent-id>/session.json                 # waap-cli session material (mode 0600)
  sandboxes/<agent-id>/.waap-agent/session.json    # materialised per-spawn
```

Override the whole data root with `AEX_FLEET_HOME=/path/to/dir`. Useful for isolating a test instance or pinning multiple operator profiles on one machine.

### Environment

| Var | Purpose |
|---|---|
| `AEX_FLEET_HOME` | Override the data root (see above) |
| `AEX_FLEET_AGENT` | Override the active agent for one invocation |
| `AEX_FLEET_NEON_DSN_RO` | Read-only Postgres DSN for `aex-fleet status` (also accepts `DATABASE_URL` for parity with the dashboards) |

## Architecture mechanics

- **Per-agent scoping**: each `aex-fleet waap …` spawn overrides `HOME` to a per-agent sandbox dir so `waap-cli`'s `~/.waap-agent/session.json` is scoped. Filing an upstream `WAAP_CONFIG_DIR` request to retire this trick.
- **Credentials**: session material lives in the file store with mode `0600`. `keytar` was deprecated; swap in `@napi-rs/keyring` (or successor) when stable — the `core/keychain.ts` surface is the swap point.
- **Telemetry**: read-only Postgres against the existing Neon schema (`agent_events`, `agent_balance_snapshots`). No schema changes.
- **Wallet linking**: consumes Lucian's upcoming `waap_linkAddress` SDK methods. Linkage verbs are gated behind `--feature linking` until they ship — see [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).

## Status of v1

Day 1–7 of a one-week prototype:

- [x] Day 1 — scaffold, `FleetManager`, locked `fleet.json`, `add`/`ls`/`use`/`rm`
- [x] Day 2 — `waap-runner` HOME-sandbox, file-backed session store, `exec` + `waap` passthrough
- [x] Day 3 — `policy get/set` with `--all`/`--tag`/`--agent` + result table + EventEmitter
- [x] Day 4 — Neon read-only client + `status` (3 aggregate queries) + graceful degradation
- [x] Day 5 — `doctor`, `SKILL.md`, Claude Code template, demo script
- [x] Day 6 — `plan` / `apply` two-phase + `--dry-run` on side-effecting verbs + `--help` polish
- [x] Day 7 — Claude Code demo transcript, `KNOWN_ISSUES.md`, upstream `WAAP_CONFIG_DIR` ask

What's deferred and why → [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).

## License

Apache-2.0
