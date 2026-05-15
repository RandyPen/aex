#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the polymarket-arbitrage template onto
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

# IMPORTANT: waap-cli stores sessions relative to HOME. The systemd service
# sets HOME to the working directory. Login with:
#   HOME=/path/to/agent ./node_modules/.bin/waap-cli login --email ... --password ...

AEX_HOST="${AEX_HOST:-agents@88.99.125.107}"
AGENT_DIR="/home/agents/polygon-polymarket-arb"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/polymarket-arbitrage/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/polymarket-arb-deploy/"
rm -rf /tmp/polymarket-arb-deploy
mkdir -p /tmp/polymarket-arb-deploy

PROJECT_NAME="polygon-polymarket-arb"
PROJECT_PKG_NAME="polygon-polymarket-arb-agent"
CHAIN_ID="137"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/polymarket-arb-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/polymarket-arb-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/polymarket-arb-deploy/tsconfig.json 2>/dev/null || true
cp "$TEMPLATE_DIR/Dockerfile" /tmp/polymarket-arb-deploy/Dockerfile 2>/dev/null || true
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/polymarket-arb-deploy/.gitignore 2>/dev/null || true

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/polymarket-arb-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm install on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm install"

echo "==> restart polymarket-arb.service"
ssh "$AEX_HOST" 'sudo systemctl restart polymarket-arb 2>/dev/null && sleep 3 && sudo systemctl status polymarket-arb --no-pager | head -8 || echo "(unit not yet installed — create systemd unit first)"'

echo "==> done"
