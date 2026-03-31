#!/bin/bash
# Enhanced dangerous command blocker — PreToolUse hook for Bash
CMD=$(jq -r '.tool_input.command' </dev/stdin)

# === DESTRUCTIVE FILE OPERATIONS ===
if echo "$CMD" | grep -qE 'rm\s+-rf\s+(/|\./?\s|\.\./)'; then
  echo '{"decision":"block","reason":"rm -rf on project root or parent blocked. See docs/SECURITY.md"}'
  exit 0
fi
if echo "$CMD" | grep -qE 'rm\s+-rf\s+\*|rm\s+-rf\s+\.$'; then
  echo '{"decision":"block","reason":"rm -rf wildcard or current directory blocked"}'
  exit 0
fi

# === GIT PROTECTION ===
if echo "$CMD" | grep -qE 'git\s+push\s+.*--force.*main|git\s+push\s+-f.*main'; then
  echo '{"decision":"block","reason":"Force push to main blocked"}'
  exit 0
fi
if echo "$CMD" | grep -qE 'git\s+push\s+.*--force.*staging|git\s+push\s+-f.*staging'; then
  echo '{"decision":"block","reason":"Force push to staging blocked"}'
  exit 0
fi
if echo "$CMD" | grep -qE 'git\s+push\s+.*--force.*develop|git\s+push\s+-f.*develop'; then
  echo '{"decision":"block","reason":"Force push to develop blocked"}'
  exit 0
fi
if echo "$CMD" | grep -qE 'git\s+reset\s+--hard\s+origin/(main|staging|develop)'; then
  echo '{"decision":"block","reason":"Hard reset to protected branch blocked. Use git revert instead."}'
  exit 0
fi

# === DATABASE PROTECTION ===
if echo "$CMD" | grep -qiE 'DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)'; then
  echo '{"decision":"block","reason":"DROP operations blocked. Use migrations."}'
  exit 0
fi
if echo "$CMD" | grep -qiE 'TRUNCATE\s+TABLE'; then
  echo '{"decision":"block","reason":"TRUNCATE blocked. Use DELETE with WHERE clause."}'
  exit 0
fi
if echo "$CMD" | grep -qiE 'ALTER\s+TABLE.*DISABLE.*ROW\s+LEVEL\s+SECURITY'; then
  echo '{"decision":"block","reason":"Disabling RLS blocked. See docs/DATABASE.md"}'
  exit 0
fi
if echo "$CMD" | grep -qiE 'ALTER\s+TABLE.*OWNER\s+TO'; then
  echo '{"decision":"block","reason":"Changing table owner blocked."}'
  exit 0
fi
if echo "$CMD" | grep -q 'supabase db reset'; then
  echo '{"decision":"block","reason":"supabase db reset blocked. Use migrations. See docs/DATABASE.md"}'
  exit 0
fi

# === SECRET EXPOSURE ===
if echo "$CMD" | grep -qE 'echo.*\$(.*SUPABASE.*KEY|.*SECRET|.*TOKEN|.*PASSWORD)'; then
  echo '{"decision":"block","reason":"Echoing environment secrets to stdout blocked. See docs/SECURITY.md"}'
  exit 0
fi
if echo "$CMD" | grep -qE 'cat\s+\.env|cat\s+.*\.env\.|head\s+.*\.env|tail\s+.*\.env'; then
  echo '{"decision":"block","reason":"Reading .env file contents blocked. Use env var references instead."}'
  exit 0
fi
if echo "$CMD" | grep -qE 'printenv|env\s*$|set\s*$'; then
  echo '{"decision":"block","reason":"Dumping all environment variables blocked. Access specific vars instead."}'
  exit 0
fi

# === NETWORK SECURITY ===
if echo "$CMD" | grep -qE 'curl.*service_role|wget.*service_role'; then
  echo '{"decision":"block","reason":"HTTP request with service_role key blocked."}'
  exit 0
fi

# === CONTAINER / PROCESS SECURITY ===
if echo "$CMD" | grep -qE 'chmod\s+777'; then
  echo '{"decision":"block","reason":"chmod 777 (world-writable) blocked. Use specific permissions."}'
  exit 0
fi
if echo "$CMD" | grep -qE 'kill\s+-9\s+1$|killall'; then
  echo '{"decision":"block","reason":"Killing system processes blocked."}'
  exit 0
fi

# === PACKAGE SECURITY ===
if echo "$CMD" | grep -qE 'npm\s+install\s+--global|pnpm\s+add\s+-g'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"WARNING: Global package installation detected. Consider using npx or project-local installation instead."}}'
fi
