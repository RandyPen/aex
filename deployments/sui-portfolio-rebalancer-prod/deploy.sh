#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the sui-portfolio-rebalancer template onto
# the `aex` Hetzner host. Re-running this updates the live agent code from
# the template's current state without disturbing the host's secrets in .env.
#
# Run from a host that has SSH access as `agents@aex`:
#   ./deploy.sh
#
# Requirements:
#   - SSH access to agents@88.99.125.107 (or set AEX_HOST below)
#   - rsync available locally
#   - sudo on aex (the agents user has passwordless sudo)

set -euo pipefail

AEX_HOST="${AEX_HOST:-agents@88.99.125.107}"
AGENT_DIR="/home/agents/sui-portfolio-rebalancer"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/sui-portfolio-rebalancer/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/sui-portfolio-rebalancer-deploy/"
rm -rf /tmp/sui-portfolio-rebalancer-deploy
mkdir -p /tmp/sui-portfolio-rebalancer-deploy

PROJECT_NAME="sui-portfolio-rebalancer"
PROJECT_PKG_NAME="sui-portfolio-rebalancer-agent"
CHAIN_ID="sui-mainnet"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/sui-portfolio-rebalancer-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/sui-portfolio-rebalancer-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/sui-portfolio-rebalancer-deploy/tsconfig.json 2>/dev/null || true
cp "$TEMPLATE_DIR/Dockerfile" /tmp/sui-portfolio-rebalancer-deploy/Dockerfile 2>/dev/null || true
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/sui-portfolio-rebalancer-deploy/.gitignore 2>/dev/null || true

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/sui-portfolio-rebalancer-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm install on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm install"

echo "==> restart sui-portfolio-rebalancer.service"
ssh "$AEX_HOST" 'sudo systemctl restart sui-portfolio-rebalancer 2>/dev/null && sleep 3 && sudo systemctl status sui-portfolio-rebalancer --no-pager | head -8 || echo "(unit not yet installed — create systemd unit first)"'

echo "==> done"
