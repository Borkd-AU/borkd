#!/bin/bash
# Token/cost monitoring script for NanoClaw
# Run as cron task on Mac Mini (hourly)
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
TODAY=$(date +%Y-%m-%d)

# Find NanoClaw log directory (adjust path as needed)
NANOCLAW_DIR="${NANOCLAW_DIR:-$HOME/nanoclaw}"
LOG_DIR="$NANOCLAW_DIR/groups/*/logs"

# Count today's container runs
RUNS=$(ls $LOG_DIR/container-${TODAY}*.log 2>/dev/null | wc -l | tr -d ' ')

# Sum total runtime (minutes)
TOTAL_MIN=0
for log in $LOG_DIR/container-${TODAY}*.log 2>/dev/null; do
  DURATION=$(grep -o 'duration_ms=[0-9]*' "$log" 2>/dev/null | head -1 | cut -d= -f2)
  if [ -n "$DURATION" ]; then
    TOTAL_MIN=$((TOTAL_MIN + DURATION / 60000))
  fi
done

echo "[TOKEN-MONITOR] $TODAY — runs: $RUNS, total_min: $TOTAL_MIN"

# Daily run limit check
MAX_DAILY_RUNS=${MAX_DAILY_RUNS:-50}
if [ "$RUNS" -gt "$MAX_DAILY_RUNS" ]; then
  # Alert via IPC to borkd-control
  IPC_DIR="$NANOCLAW_DIR/data/ipc/borkd-control/messages"
  if [ -d "$IPC_DIR" ]; then
    cat > "$IPC_DIR/token-alert-$(date +%s).json" << EOF
{
  "type": "message",
  "text": "Daily container run limit exceeded: $RUNS/$MAX_DAILY_RUNS runs. Total runtime: ${TOTAL_MIN}m."
}
EOF
  fi
fi
