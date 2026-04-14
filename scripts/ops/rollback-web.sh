#!/usr/bin/env bash
# rollback-web.sh — revert a Vercel project to its previous production deployment.
#
# Usage:
#   ./scripts/ops/rollback-web.sh <project>       # interactive pick
#   ./scripts/ops/rollback-web.sh <project> <n>   # non-interactive, pick n'th previous
#
# <project>: vercel project name. e.g.
#   borkd-admin        (Next.js admin)
#   borkd-mobile-dev   (Expo web preview)
#
# Requires `vercel` CLI authenticated (`vercel login`). Run from repo root.
# See docs/ROLLBACK.md §1 for the full runbook.
set -euo pipefail

PROJECT="${1:-}"
N="${2:-1}"

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project> [n]"
  echo "  <project>: borkd-admin | borkd-mobile-dev"
  echo "  [n]: rollback to n'th previous production deployment (default: 1)"
  exit 2
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "error: vercel CLI not installed. npm i -g vercel" >&2
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "error: not logged in to Vercel. Run 'vercel login'." >&2
  exit 1
fi

echo "Fetching last 10 production deployments for $PROJECT…"
deployments=$(vercel ls "$PROJECT" --prod --meta --count 10 2>/dev/null || true)
if [ -z "$deployments" ]; then
  echo "error: no production deployments found for $PROJECT" >&2
  exit 1
fi

echo
echo "$deployments"
echo

# The N+1'th deployment (index 0 is current, 1 is previous) is the rollback target.
target_url=$(echo "$deployments" \
  | awk 'NR > 2 && /https:\/\// { print $2 }' \
  | sed -n "$((N + 1))p")

if [ -z "$target_url" ]; then
  echo "error: couldn't find deployment index $N" >&2
  exit 1
fi

echo "Target rollback URL: $target_url"
read -r -p "Promote this deployment to production? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) echo "Aborted."; exit 0 ;;
esac

# Promote the old deployment by aliasing the production domain to it.
# Vercel stores the project's production alias in the dashboard; we read
# whatever current alias points to and reuse it.
current_alias=$(vercel alias ls --scope="${VERCEL_SCOPE:-}" 2>/dev/null \
  | grep "$PROJECT" | head -1 | awk '{print $1}' || true)

if [ -z "$current_alias" ]; then
  echo "error: couldn't detect current production alias. Promote manually:" >&2
  echo "  vercel promote $target_url" >&2
  exit 1
fi

echo "Aliasing $current_alias → $target_url"
vercel alias set "$target_url" "$current_alias"

echo
echo "Rollback complete. Verify:"
echo "  curl -I https://$current_alias"
echo "  Post-mortem: docs/postmortems/$(date +%Y-%m-%d)-<slug>.md"
