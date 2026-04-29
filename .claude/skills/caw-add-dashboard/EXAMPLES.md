# caw-add-dashboard — Example Prompts

## Tier 1: Minimal (skill infers everything)

```
/caw-add-dashboard cetus-yield-agent
```

```
Add a dashboard for the Morpho yield agent
```

```
Scaffold a dashboard for evm-uniswap-rebalancer
```

## Tier 2: Explicit type

```
/caw-add-dashboard --activity morpho-yield-agent --type lending
```

```
Add a dashboard for the Polymarket agent. It's a trading agent.
```

```
/caw-add-dashboard --activity snapshot-agent --type governance --name "Snapshot Voter Dashboard"
```

## Tier 3: New agent + dashboard together

```
I just ran /caw-add-activity for a NAVI lending agent on Sui. Now add a dashboard for it.
```

```
We have a new sui-turbos-rebalancer activity. Add an LP dashboard for it.
```

## Anti-patterns

Do NOT:
- Add Tailwind or any CSS framework (use tokens.css)
- Add chart libraries other than Recharts
- Hardcode log paths (use LOG_DIR env var)
- Skip mock data (dashboard must work on Vercel)
- Skip the build verification step
- Generate a dashboard without understanding what events the agent emits

## Expected output

After running the skill, you should see:

```
Dashboard scaffolded at dashboards/morpho/

Components included:
  Universal: StatCard, BalanceChart, EventList, AgentConfig, AgentExplainer, PerformanceCard
  Lending:   RateCard, HealthFactorGauge, ProtocolComparison

Next steps:
  cd dashboards/morpho && npm run dev
  Open http://localhost:3000
```
