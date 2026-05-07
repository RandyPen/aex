#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the morpho-yield-agent template onto
# the `aex` Hetzner host. Re-running this updates the live agent code from
# the template's current state without disturbing the host's secrets in .env.
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
AGENT_DIR="/home/agents/arbitrum-morpho-yield"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/morpho-yield-agent/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/morpho-yield-deploy/"
rm -rf /tmp/morpho-yield-deploy
mkdir -p /tmp/morpho-yield-deploy

PROJECT_NAME="arbitrum-morpho-yield"
PROJECT_PKG_NAME="arbitrum-morpho-yield-agent"
CHAIN_ID="42161"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/morpho-yield-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/morpho-yield-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/morpho-yield-deploy/tsconfig.json
cp "$TEMPLATE_DIR/Dockerfile" /tmp/morpho-yield-deploy/Dockerfile
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/morpho-yield-deploy/.gitignore

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/morpho-yield-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm ci on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm ci"

echo "==> restart morpho-yield.service"
ssh "$AEX_HOST" 'sudo systemctl restart morpho-yield 2>/dev/null && sleep 3 && sudo systemctl status morpho-yield --no-pager | head -8 || echo "(unit not yet installed — copy systemd file from sui-cetus-yield-prod and adapt)"'

echo "==> done"
