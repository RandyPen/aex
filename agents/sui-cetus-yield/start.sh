#!/bin/bash
# Start the Cetus yield agent if not already running.
# Uses a PID file for reliable detection — pgrep pattern matching
# is unreliable when the process is started via cd + nohup.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="${AGENT_DIR:-$SCRIPT_DIR}"
LOG_DIR="${LOG_DIR:-$AGENT_DIR/logs}"
LOG="$LOG_DIR/sui-cetus-yield.stdout.log"
WATCHDOG_LOG="$LOG_DIR/sui-cetus-yield-watchdog.log"
PID_FILE="$AGENT_DIR/agent.pid"

mkdir -p "$LOG_DIR"

# Check if agent is already running via PID file
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    # Process is still alive
    exit 0
  else
    # Stale PID file — process died
    echo "$(date): Stale PID $PID found, cleaning up" >> "$WATCHDOG_LOG"
    rm -f "$PID_FILE"
  fi
fi

# Kill any orphaned agent instances before starting a new one
pkill -f "node.*agent\.js" 2>/dev/null
sleep 1

cd "$AGENT_DIR" && nohup node agent.js >> "$LOG" 2>&1 &
AGENT_PID=$!
echo "$AGENT_PID" > "$PID_FILE"
echo "$(date): Agent started with PID $AGENT_PID" >> "$WATCHDOG_LOG"
