#!/usr/bin/env bash
# deploy.sh — idempotent deployment of the recurring-payments template onto
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
AGENT_DIR="/home/agents/base-recurring-payments"
TEMPLATE_DIR="$(cd "$(dirname "$0")/../../agents/recurring-payments/templates/standalone" && pwd)"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "template not found at $TEMPLATE_DIR" >&2
  exit 1
fi

echo "==> rendering template to /tmp/recurring-payments-deploy/"
rm -rf /tmp/recurring-payments-deploy
mkdir -p /tmp/recurring-payments-deploy

PROJECT_NAME="base-recurring-payments"
PROJECT_PKG_NAME="base-recurring-payments-agent"
CHAIN_ID="8453"

sed "s/{{projectName}}/$PROJECT_NAME/g; s/{{chainId}}/$CHAIN_ID/g" \
  "$TEMPLATE_DIR/agent.ts.tpl" > /tmp/recurring-payments-deploy/agent.ts
sed "s/{{projectPkgName}}/$PROJECT_PKG_NAME/g" \
  "$TEMPLATE_DIR/package.json.tpl" > /tmp/recurring-payments-deploy/package.json
cp "$TEMPLATE_DIR/tsconfig.json" /tmp/recurring-payments-deploy/tsconfig.json 2>/dev/null || true
cp "$TEMPLATE_DIR/Dockerfile" /tmp/recurring-payments-deploy/Dockerfile 2>/dev/null || true
cp "$TEMPLATE_DIR/dot-gitignore" /tmp/recurring-payments-deploy/.gitignore 2>/dev/null || true

echo "==> rsync to $AEX_HOST:$AGENT_DIR (preserving .env)"
rsync -avz --exclude '.env' --exclude 'node_modules' --exclude 'logs' \
  /tmp/recurring-payments-deploy/ "$AEX_HOST:$AGENT_DIR/"

echo "==> npm install on remote"
ssh "$AEX_HOST" "cd $AGENT_DIR && npm install"

echo "==> restart recurring-payments.service"
ssh "$AEX_HOST" 'sudo systemctl restart recurring-payments 2>/dev/null && sleep 3 && sudo systemctl status recurring-payments --no-pager | head -8 || echo "(unit not yet installed — create systemd unit first)"'

echo "==> done"
