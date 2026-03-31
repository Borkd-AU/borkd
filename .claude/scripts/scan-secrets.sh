#!/bin/bash
# Enhanced secret scanner — PreToolUse hook for Write|Edit
INPUT=$(cat </dev/stdin)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .env files are allowed to contain secrets
if echo "$FILE" | grep -qE '\.env(\.|$)'; then
  exit 0
fi

# === LAYER 1: Known secret patterns ===
PATTERNS=(
  # Stripe
  'sk_live_[a-zA-Z0-9]{20,}'
  'sk_test_[a-zA-Z0-9]{20,}'
  'pk_live_[a-zA-Z0-9]{20,}'
  'pk_test_[a-zA-Z0-9]{20,}'
  # JWT / Supabase
  'eyJhbGciOi[a-zA-Z0-9_-]{50,}'
  'service_role'
  'supabase_service_role'
  'SUPABASE_SERVICE_ROLE'
  # Private keys
  '-----BEGIN.*PRIVATE KEY'
  '-----BEGIN.*RSA'
  # AWS
  'AKIA[0-9A-Z]{16}'
  'aws_secret_access_key'
  'AWS_SECRET_ACCESS_KEY'
  # Google
  'AIza[0-9A-Za-z_-]{35}'
  # Generic API keys / tokens
  'ghp_[a-zA-Z0-9]{36}'
  'gho_[a-zA-Z0-9]{36}'
  'github_pat_[a-zA-Z0-9_]{82}'
  'xox[bporas]-[a-zA-Z0-9-]{10,}'
  # Discord
  '[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9-_]{6}\.[A-Za-z0-9-_]{27}'
  # Database URLs with credentials
  'postgres(ql)?://[^:]+:[^@]+@'
  'mysql://[^:]+:[^@]+@'
  'mongodb(\+srv)?://[^:]+:[^@]+@'
)

for PATTERN in "${PATTERNS[@]}"; do
  if echo "$CONTENT" | grep -qE -- "$PATTERN" 2>/dev/null; then
    echo "{\"decision\":\"block\",\"reason\":\"Secret pattern detected in source code. Use environment variables instead. See docs/SECURITY.md\"}"
    exit 0
  fi
done

# === LAYER 2: High-entropy string detection ===
# Check for long base64-like strings that might be API keys (>40 chars of alphanumeric)
if echo "$CONTENT" | grep -qE '(token|key|secret|password|credential|auth).*=.*["\x27][A-Za-z0-9+/=_-]{40,}["\x27]'; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"WARNING: Possible secret assignment detected. Variable name contains 'token/key/secret/password'. Verify this is not a hardcoded credential. See docs/SECURITY.md\"}}"
fi

# === LAYER 3: Dangerous URL patterns ===
if echo "$CONTENT" | grep -qE 'https?://[^/]*:(anon|service_role|secret)@'; then
  echo "{\"decision\":\"block\",\"reason\":\"URL with embedded credentials detected. Use environment variables.\"}"
  exit 0
fi
