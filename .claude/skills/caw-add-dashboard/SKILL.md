---
name: caw-add-dashboard
description: Scaffold a standalone monitoring dashboard for a starter agent in the create-agent-wallet registry. Use when the user wants to add a dashboard for an existing or new agent activity (e.g. "add a dashboard for the Cetus yield agent", "scaffold a dashboard for evm-morpho-yield_optimizer"). Generates a Next.js app with pre-selected components based on agent type, mock data fallback, and Vercel deployment config.
metadata:
  author: holonym-foundation
  version: '1.0'
  scope: aex dashboards
  related-issues: 'aex#1'
---

# Add a Dashboard to the AEX Dashboard Registry

Scaffolds a new dashboard into `dashboards/<slug>/` in the AEX repo with all files needed to monitor a starter agent. Uses shared universal components from `dashboards/_shared/` and generates protocol-specific components based on agent type.

This skill is for maintainers who want to add a monitoring dashboard for an agent without manually building a Next.js app from scratch.

---

## Input you expect from the user

1. **Activity slug** — the slug from the create-agent-wallet registry (e.g. `cetus-yield-agent`, `morpho-yield-agent`). If the user gives a protocol name instead of a slug, resolve it.
2. **Agent type** — one of: `lp`, `lending`, `trading`, `governance`, `generic`. If not provided, infer from the activity name:
   - `yield`, `rebalancer`, `clmm`, `lp` → `lp`
   - `lending`, `supply`, `borrow` → `lending`
   - `trading`, `prediction`, `swap`, `order` → `trading`
   - `governance`, `voter`, `snapshot` → `governance`
   - Anything else → `generic`
3. **Dashboard name** (optional) — human-readable name for the dashboard. Defaults to "{Protocol} {Action} Dashboard".

If the user provides just an activity slug, infer everything else. Only ask for clarification if the agent type is ambiguous.

---

## Component selection

### Universal components (always included)

Copied from `dashboards/_shared/components/`:

| Component | Purpose |
|---|---|
| `StatCard` | Quick metric cards (balance, uptime, status) |
| `BalanceChart` | Wallet balance over time (Recharts line chart) |
| `EventList` | Chronological event feed (last 50 events, reversed) |
| `AgentConfig` | Display agent configuration parameters |
| `AgentExplainer` | Human-readable description of agent behavior |
| `PerformanceCard` | PnL, gas spent, APY estimation, rebalance count |
| `AgentNav` | Tab switcher for multiple agents |

### Protocol-specific components (generated based on agent type)

| Agent type | Components to generate |
|---|---|
| `lp` | `PositionCard` (visual range slider, drift %, time in range), `PoolComparison` (top pools by APY), `VolatilityCard` (volatility gauge, adaptive range) |
| `lending` | `RateCard` (supply/borrow rates, utilization), `HealthFactorGauge` (liquidation risk), `ProtocolComparison` (cross-protocol rate comparison) |
| `trading` | `OrderHistory` (recent orders, fill status), `PositionPnL` (open positions, unrealized P&L), `SignalFeed` (agent decision signals) |
| `governance` | `ProposalList` (active proposals, vote status), `VoteHistory` (past votes), `DelegationStatus` (delegated voting power) |
| `generic` | No extra components — universal set only |

Use the existing Cetus dashboard components as the reference implementation for `lp` type. For other types, generate new components following the same patterns (same CSS token system, same data flow from log parsing).

---

## Workflow

### 0. Preflight

```bash
# Confirm we're in the AEX repo
ls dashboards/_shared/components/StatCard.tsx || echo "ERROR: Run from AEX repo root"

# Check that the activity slug exists in the create-agent-wallet registry (if accessible)
# If not accessible, proceed with user-provided info
```

### 1. Determine the dashboard slug

Use the activity slug as the dashboard slug. If the activity slug is long (e.g. `sui-cetus-yield_optimizer`), use a short form (e.g. `cetus`).

Check it doesn't conflict:
```bash
ls dashboards/
cat dashboards/registry.json
```

### 2. Create the dashboard directory

```bash
SLUG=morpho  # example
mkdir -p dashboards/$SLUG/src/app/api/agent
mkdir -p dashboards/$SLUG/src/components
mkdir -p dashboards/$SLUG/src/lib
mkdir -p dashboards/$SLUG/public
```

### 3. Copy universal components

```bash
cp dashboards/_shared/components/*.tsx dashboards/$SLUG/src/components/
cp dashboards/_shared/lib/types.ts dashboards/$SLUG/src/lib/
cp dashboards/_shared/lib/read-logs.ts dashboards/$SLUG/src/lib/
cp dashboards/_shared/globals.css dashboards/$SLUG/src/app/
cp dashboards/_shared/tokens.css dashboards/$SLUG/src/app/
```

### 4. Generate protocol-specific components

Based on the agent type, generate the additional components. Use the Cetus dashboard's protocol-specific components as the pattern:

- Same CSS class naming (`.card`, `.stat-value`, `.gauge`, etc.)
- Same data flow (component receives data as props from the page)
- Same responsive grid layout patterns
- Include helpful explanatory text for non-technical users

### 5. Generate the API route

Create `src/app/api/agent/route.ts` that:
- Imports from `@/lib/read-logs`
- Returns agent metadata, balance history, events, and type-specific data
- Falls back to mock data when `VERCEL=1`

### 6. Generate mock data

Create `src/lib/mock-data.ts` with:
- Agent metadata (id, name, description, chain, protocol, wallet address, tools)
- Realistic sample data for each component
- Mock balance history with plausible values

### 7. Generate the main page

Create `src/app/page.tsx` that:
- Fetches `/api/agent?id={agentId}` every 30 seconds
- Renders all universal + protocol-specific components in a responsive grid
- Shows loading and error states

### 8. Generate config files

- `package.json` — name: `aex-{slug}-dashboard`, deps: next, react, react-dom, recharts
- `tsconfig.json` — standard Next.js config
- `next.config.ts` — standard Next.js config
- `next-env.d.ts` — Next.js type declarations
- `.gitignore` — node_modules, .next, .env, .vercel
- `layout.tsx` — standard Next.js layout with metadata

### 9. Verify the build

```bash
cd dashboards/$SLUG
npm install
npm run build
```

Build must pass before proceeding.

### 10. Update the registry

Add an entry to `dashboards/registry.json`:

```json
{
  "slug": "<slug>",
  "name": "<Dashboard Name>",
  "agentSlug": "<activity-slug>",
  "chain": "<chain>",
  "protocol": "<protocol>",
  "type": "<lp|lending|trading|governance|generic>",
  "components": ["universal", "<type>"],
  "vercelUrl": null
}
```

### 11. Summary

Print what was created:
- Dashboard path
- Components included (universal + protocol-specific)
- Next steps: `cd dashboards/<slug> && npm run dev` to preview locally

---

## Log event contract

The dashboard reads JSON log files written by the agent. Each line is a JSON object with at minimum:

```json
{"ts": "ISO-8601", "agent": "agent-id", "level": "info|event|error|warn", "message": "event_type", ...data}
```

### Universal events (all agents should emit these)

| Event message | Required fields | Used by |
|---|---|---|
| `balance_snapshot` | `balance`, optionally `usdcBalance` | BalanceChart |
| `Agent starting` | `mode` | EventList, status detection |
| `Cycle` | varies by agent | EventList |

### LP-specific events

| Event message | Required fields | Used by |
|---|---|---|
| `position_status` | `tickLower`, `tickUpper`, `currentTick`, `drift`, `threshold`, `rangeWidth`, `inRange`, `timeInRangePct`, `volatility`, `adaptiveRange` | PositionCard, VolatilityCard |
| `rebalance_complete` | `txHash`, `newTickLower`, `newTickUpper`, `gasSpent` | EventList, PerformanceCard |
| `yield_scan` | `cetusTopPools`, `crossProtocol`, `currentPool` | PoolComparison, CrossProtocol |

### Lending-specific events

| Event message | Required fields | Used by |
|---|---|---|
| `position_status` | `supplyApy`, `borrowApy`, `utilization`, `healthFactor`, `supplied`, `borrowed` | RateCard, HealthFactorGauge |
| `rate_scan` | `protocols`, `currentProtocol`, `bestAlternative` | ProtocolComparison |

### Trading-specific events

| Event message | Required fields | Used by |
|---|---|---|
| `order_placed` | `side`, `price`, `size`, `status`, `txHash` | OrderHistory |
| `position_update` | `unrealizedPnl`, `entryPrice`, `currentPrice`, `size` | PositionPnL |
| `signal` | `type`, `confidence`, `reasoning` | SignalFeed |

### Governance-specific events

| Event message | Required fields | Used by |
|---|---|---|
| `vote_cast` | `proposalId`, `proposalTitle`, `choice`, `txHash` | VoteHistory |
| `proposal_detected` | `proposalId`, `title`, `status`, `deadline` | ProposalList |

---

## Gotchas

1. **Log path must be configurable.** Always use `process.env.LOG_DIR || "./logs"` — never hardcode absolute paths.
2. **Mock data fallback is required.** Every dashboard must work on Vercel where there are no local log files. Check `process.env.VERCEL === "1"` and return mock data.
3. **Recharts is the only charting library.** Don't introduce additional chart dependencies.
4. **CSS tokens, not Tailwind.** The dashboard design system uses CSS custom properties defined in `tokens.css`. Don't add Tailwind or other CSS frameworks.
5. **30-second polling interval.** The page fetches `/api/agent` every 30 seconds. Don't make it faster (unnecessary load) or slower (stale data).
6. **Agent ID from query param.** The API route reads `?id=<agentId>` and uses it to find the log file. Don't hardcode agent IDs.
7. **Build must pass.** Always run `npm run build` after scaffolding. If it fails, fix it before committing.

---

## Reference implementation

The Cetus dashboard at `dashboards/cetus/` is the canonical reference. It demonstrates:
- All 6 universal components in use
- 4 protocol-specific components (PositionCard, PoolComparison, VolatilityCard, CrossProtocol)
- Log parsing with fallback reconstruction from legacy events
- Mock data generator with realistic Cetus pool data
- Responsive grid layout with the token-based design system
- Human-readable explanatory text throughout
