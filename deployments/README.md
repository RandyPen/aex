# AEX Deployments

Each subdirectory represents a deployed agent instance on the AEX Hetzner host.

## How to Deploy

### 1. deploy.sh

Every deployment has a `deploy.sh` script that:

1. Renders the agent template (substituting placeholders like project name, chain ID)
2. Rsyncs the rendered code to the remote host (preserving `.env` and `node_modules`)
3. Runs `npm install` (or `npm ci`) on the remote
4. Restarts the systemd service

Run from any machine with SSH access to the AEX host:

    cd deployments/<agent>-prod
    ./deploy.sh

### 2. Systemd Unit

Each agent runs as a systemd service. Example unit file:

    [Unit]
    Description=AEX polymarket agent
    After=network-online.target

    [Service]
    Type=simple
    User=agents
    WorkingDirectory=/home/agents/polygon-polymarket
    Environment=HOME=/home/agents/polygon-polymarket
    ExecStart=/usr/bin/npx tsx agent.ts
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target

Install with:

    sudo cp polymarket.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable --now polymarket

### 3. waap-cli Login with HOME Override

IMPORTANT: waap-cli stores sessions relative to HOME. The systemd service sets HOME
to the working directory so that the running agent finds its session. You must log in
with the same HOME override, otherwise the agent will not find the session at runtime.

Login with:

    HOME=/home/agents/<agent-dir> ./node_modules/.bin/waap-cli login --email <email> --password <password>

This creates the session file inside the agent's working directory where the systemd
service will find it.

### 4. Tailer Service

For agents that emit structured JSON logs, a tailer service reads the log file and
forwards entries to the dashboard backend. The tailer runs as a separate systemd unit
alongside the agent.

## Deployment Inventory

| Directory | Agent | Chain |
|---|---|---|
| arbitrum-morpho-yield-prod | morpho-yield-agent | Arbitrum |
| base-evm-portfolio-rebalancer-prod | evm-portfolio-rebalancer | Base |
| base-recurring-payments-prod | recurring-payments | Base |
| base-wallet-test-agent-prod | blank-project | Base |
| evm-snapshot-agent-prod | snapshot-agent | EVM |
| polygon-polymarket-prod | polymarket-agent | Polygon |
| polygon-polymarket-llm-prod | polymarket-llm-analyst | Polygon |
| polygon-polymarket-arb-prod | polymarket-arbitrage | Polygon |
| sui-cetus-yield-prod | cetus-yield-agent | Sui |
| sui-portfolio-rebalancer-prod | sui-portfolio-rebalancer | Sui |
