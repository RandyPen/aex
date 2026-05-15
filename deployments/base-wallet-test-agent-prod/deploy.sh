#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the cicd-agent (wallet test) template onto
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
AGENT_DIR="/home/agents/base-wallet-test-agent"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/cicd-agent/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/wallet-test-agent-deploy/"
rm -rf /tmp/wallet-test-agent-deploy
mkdir -p /tmp/wallet-test-agent-deploy

PROJECT_NAME="base-wallet-test-agent"
PROJECT_PKG_NAME="base-wallet-test-agent"
CHAIN_ID="8453"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/wallet-test-agent-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/wallet-test-agent-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/wallet-test-agent-deploy/tsconfig.json 2>/dev/null || true
cp "$TEMPLATE_DIR/Dockerfile" /tmp/wallet-test-agent-deploy/Dockerfile 2>/dev/null || true
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/wallet-test-agent-deploy/.gitignore 2>/dev/null || true

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/wallet-test-agent-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm install on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm install"

echo "==> restart wallet-test-agent.service"
ssh "$AEX_HOST" 'sudo systemctl restart wallet-test-agent 2>/dev/null && sleep 3 && sudo systemctl status wallet-test-agent --no-pager | head -8 || echo "(unit not yet installed — create systemd unit first)"'

echo "==> done"
