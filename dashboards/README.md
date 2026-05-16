# AEX Dashboards

Web dashboards for monitoring AEX agents. Each dashboard reads structured JSON log
lines emitted by its corresponding agent.

## Dashboard Catalog

| Dashboard | Agent | Chain | Protocol | Type |
|---|---|---|---|---|
| cetus | cetus-yield-agent | Sui | Cetus | LP |
| polymarket | polymarket-agent | Polygon | Polymarket | Signal trader |
| polymarket-llm-analyst | polymarket-llm-analyst | Polygon | Polymarket | Signal trader |
| polymarket-arbitrage | polymarket-arbitrage | Polygon | Polymarket | Arbitrage |
| uniswap-rebalancer | evm-uniswap-rebalancer | EVM | Uniswap | Rebalancer |
| evm-portfolio-rebalancer | evm-portfolio-rebalancer | EVM | -- | Rebalancer |
| sui-portfolio-rebalancer | sui-portfolio-rebalancer | Sui | -- | Rebalancer |

## Registry

`registry.json` is the canonical list of all dashboards. It maps each dashboard slug
to its agent, chain, component set, and optional Vercel deployment URL.

## Shared Components

The `_shared/` directory contains reusable dashboard components (charts, tables,
layout) used across all dashboards.
