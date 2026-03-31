#!/bin/bash
FILE=$(jq -r '.tool_response.filePath // .tool_input.file_path' </dev/stdin)
if echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx|json)$'; then
  cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 0
  npx biome check --write "$FILE" 2>/dev/null || true
fi
