#!/bin/bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
DIR="$ROOT/.claude/context/sessions"
mkdir -p "$DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
MODIFIED=$(git diff --name-only 2>/dev/null | head -20)
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

SUMMARY=$(cat << EOF
# Session: $TIMESTAMP
- Branch: $BRANCH
- Uncommitted changes: $UNCOMMITTED
- Modified files:
$(echo "$MODIFIED" | sed 's/^/  - /')

## Current task
$(cat "$ROOT/.claude/context/current-task.md" 2>/dev/null || echo "No task file found")
EOF
)

# Save session summary to file
echo "$SUMMARY" > "$DIR/$TIMESTAMP.md"

# Update heartbeat for MacBook Pro
HEARTBEAT="$ROOT/.claude/context/heartbeat.json"
if [ -f "$HEARTBEAT" ] && command -v jq &>/dev/null; then
  jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     --arg branch "$BRANCH" \
     '.macbook_pro.last_seen = $ts | .macbook_pro.branch = $branch' \
     "$HEARTBEAT" > "$HEARTBEAT.tmp" && mv "$HEARTBEAT.tmp" "$HEARTBEAT"
fi

# Post to Discord webhook (if configured)
WEBHOOK_FILE="$ROOT/.claude/discord-webhook.url"
if [ -f "$WEBHOOK_FILE" ]; then
  WEBHOOK_URL=$(cat "$WEBHOOK_FILE")
  DISCORD_MSG=$(echo "$SUMMARY" | head -20 | sed 's/"/\\"/g' | tr '\n' ' ')
  curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"$DISCORD_MSG\"}" \
    2>/dev/null || true
fi
