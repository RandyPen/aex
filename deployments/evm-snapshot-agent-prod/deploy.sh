#!/usr/bin/env bash
set -euo pipefail

# IMPORTANT: waap-cli stores sessions relative to HOME. The systemd service
# sets HOME to the working directory. Login with:
#   HOME=/path/to/agent ./node_modules/.bin/waap-cli login --email ... --password ...

AEX_HOST="${AEX_HOST:-agents@88.99.125.107}"
AGENT_DIR="/home/agents/evm-snapshot-agent"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/snapshot-agent/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/snapshot-deploy/"
rm -rf /tmp/snapshot-deploy
mkdir -p /tmp/snapshot-deploy

PROJECT_NAME="evm-snapshot-agent"
PROJECT_PKG_NAME="evm-snapshot-agent"
CHAIN_ID="1"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/snapshot-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/snapshot-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/snapshot-deploy/tsconfig.json 2>/dev/null || true
cp "$TEMPLATE_DIR/Dockerfile" /tmp/snapshot-deploy/Dockerfile 2>/dev/null || true
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/snapshot-deploy/.gitignore 2>/dev/null || true

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/snapshot-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm install on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm install"

echo "==> restart snapshot-agent.service"
ssh "$AEX_HOST" 'sudo systemctl restart snapshot-agent 2>/dev/null && sleep 3 && sudo systemctl status snapshot-agent --no-pager | head -8 || echo "(unit not yet installed)"'

echo "==> done"
