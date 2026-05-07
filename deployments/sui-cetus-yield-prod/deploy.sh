#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the cetus-yield-agent template onto the
# `aex` Hetzner host. Re-running this updates the live agent code from the
# template's current state without disturbing the host's secrets in .env.
#
# Run from a host that has SSH access as `agents@aex`:
#   ./deploy.sh
#
# Requirements:
#   - SSH config alias `aex` (or set AEX_HOST below)
#   - rsync available locally
#   - sudo on aex (the agents user has passwordless sudo)

set -euo pipefail

AEX_HOST="${AEX_HOST:-aex}"
AGENT_DIR="/home/agents/sui-cetus-yield"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/cetus-yield-agent/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/cetus-yield-deploy/"
rm -rf /tmp/cetus-yield-deploy
mkdir -p /tmp/cetus-yield-deploy

# Render placeholders for this deployment instance
PROJECT_NAME="sui-cetus-yield"
PROJECT_PKG_NAME="sui-cetus-yield-agent"
sed "s/{{projectName}}/$PROJECT_NAME/g" "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/cetus-yield-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" "$TEMPLATE_DIR/package.json.tpl" > /tmp/cetus-yield-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/cetus-yield-deploy/tsconfig.json
cp "$TEMPLATE_DIR/Dockerfile" /tmp/cetus-yield-deploy/Dockerfile
cp "$TEMPLATE_DIR/docker-compose.yml" /tmp/cetus-yield-deploy/docker-compose.yml
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/cetus-yield-deploy/.gitignore

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/cetus-yield-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm ci on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm ci"

echo "==> restart cetus-yield.service"
ssh "$AEX_HOST" 'sudo systemctl restart cetus-yield && sleep 3 && sudo systemctl status cetus-yield --no-pager | head -8'

echo "==> done"
