# AEX Agents

All agent templates live in this directory. Each agent is a standalone TypeScript
process that uses `waap-cli` for wallet operations (signing, balances) via 2PC-MPC --
no raw private keys in the environment.

## Agent Catalog

| Agent | Category | Chain | Status |
|---|---|---|---|
| blank-project | Starter template | EVM | Template only |
| cetus-yield-agent | Liquidity provision | Sui (Cetus) | Production |
| cicd-agent | CI/CD testing | EVM | Internal |
| evm-portfolio-rebalancer | Portfolio rebalancing | EVM (Base) | Production |
| evm-uniswap-rebalancer | DEX rebalancing | EVM (Uniswap) | Production |
| morpho-yield-agent | Yield optimization | EVM (Arbitrum, Morpho) | Production |
| polymarket-agent | Signal trading | Polygon (Polymarket) | Production |
| polymarket-arbitrage | Arbitrage | Polygon (Polymarket) | Production |
| polymarket-llm-analyst | LLM-driven analysis | Polygon (Polymarket) | Production |
| recurring-payments | Scheduled transfers | EVM (Base) | Production |
| snapshot-agent | Governance voting | EVM | Production |
| sui-cetus-yield | Yield optimization | Sui (Cetus) | Production |
| sui-portfolio-rebalancer | Portfolio rebalancing | Sui | Production |

## Structure

Each agent directory contains:

- `templates/standalone/agent.ts.tpl` -- the main agent template with `{{placeholders}}`
- `templates/standalone/package.json.tpl` -- package manifest template
- `templates/standalone/tsconfig.json` -- TypeScript config
- `templates/standalone/Dockerfile` -- container build (optional)

Templates are rendered by `deploy.sh` scripts in `../deployments/` which substitute
project-specific values (name, chain ID, etc.) before deploying to the host.
