#!/bin/bash
FILE=$(jq -r '.tool_response.filePath // .tool_input.file_path' </dev/stdin)
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

if echo "$FILE" | grep -q "apps/mobile"; then
  cd "$ROOT/apps/mobile" && npx tsc --noEmit 2>&1 | tail -5
elif echo "$FILE" | grep -q "apps/admin"; then
  cd "$ROOT/apps/admin" && npx tsc --noEmit 2>&1 | tail -5
elif echo "$FILE" | grep -q "packages/shared"; then
  cd "$ROOT/packages/shared" && npx tsc --noEmit 2>&1 | tail -5
fi
