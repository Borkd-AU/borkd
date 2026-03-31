#!/bin/bash
CMD=$(jq -r '.tool_input.command' </dev/stdin)

# Only validate git commit commands
if ! echo "$CMD" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Extract commit message from -m option
MSG=$(echo "$CMD" | sed -n 's/.*-m[[:space:]]*["\x27]\([^"\x27]*\).*/\1/p' | head -1)
if [ -z "$MSG" ]; then
  exit 0
fi

# Validate conventional commit format
if ! echo "$MSG" | grep -qE '^(feat|fix|refactor|docs|test|chore|style|perf|ci)\(.+\):'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"Warning: Commit message should follow: type(scope): description. Types: feat|fix|refactor|docs|test|chore|style|perf|ci. Scopes: mobile|admin|shared|supabase|config|ci\"}}"
fi
