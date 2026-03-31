#!/bin/bash
# Architectural dependency enforcement
# Runs as PostToolUse hook on Write|Edit for .ts/.tsx files
INPUT=$(cat </dev/stdin)
FILE=$(echo "$INPUT" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# Only check TypeScript files
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

VIOLATIONS=""

# Rule 1: apps/mobile cannot import from apps/admin
if echo "$FILE" | grep -q "apps/mobile"; then
  if grep -qE "from ['\"].*apps/admin" "$FILE" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}\nVIOLATION: apps/mobile cannot import from apps/admin in $FILE"
  fi
fi

# Rule 2: apps/admin cannot import from apps/mobile
if echo "$FILE" | grep -q "apps/admin"; then
  if grep -qE "from ['\"].*apps/mobile" "$FILE" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}\nVIOLATION: apps/admin cannot import from apps/mobile in $FILE"
  fi
fi

# Rule 3: packages/shared cannot import from apps/*
if echo "$FILE" | grep -q "packages/shared"; then
  if grep -qE "from ['\"].*apps/" "$FILE" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}\nVIOLATION: packages/shared cannot import from apps/ in $FILE"
  fi
fi

# Rule 4: apps/* cannot import from supabase/functions/
if echo "$FILE" | grep -q "apps/"; then
  if grep -qE "from ['\"].*supabase/functions" "$FILE" 2>/dev/null; then
    VIOLATIONS="${VIOLATIONS}\nVIOLATION: apps/ cannot import from supabase/functions/ in $FILE"
  fi
fi

# Rule 5: Detect hardcoded hex colors in component files (should use tokens)
if echo "$FILE" | grep -qE '(components|features)/.*\.(tsx)$'; then
  HARDCODED_HEX=$(grep -oE '#[0-9A-Fa-f]{6}' "$FILE" 2>/dev/null | head -5)
  if [ -n "$HARDCODED_HEX" ]; then
    VIOLATIONS="${VIOLATIONS}\nWARNING: Hardcoded hex colors found in $FILE: $HARDCODED_HEX — use Tailwind/NativeWind tokens instead"
  fi
fi

if [ -n "$VIOLATIONS" ]; then
  # Escape for JSON
  ESCAPED=$(echo -e "$VIOLATIONS" | sed 's/"/\\"/g' | tr '\n' ' ')
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"Architecture check: $ESCAPED. See docs/ARCHITECTURE.md for dependency rules.\"}}"
fi
