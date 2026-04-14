#!/usr/bin/env bash
# new-branch.sh — create a worktree + feature branch from develop.
#
# Usage:
#   ./scripts/ops/new-branch.sh <type> <slug>
#   ./scripts/ops/new-branch.sh feat walk-multi-dog
#
# Types: feat | feat-exp | fix | ui | chore | refactor | perf | docs
#        test | style | build | ci
#
# For hotfix/*, use hotfix.sh instead (forks from main, not develop).
# For release/*, use release.sh.
#
# Effect:
#   1. Fetches origin.
#   2. Creates ~/Desktop/DEV_Local/borkd-<slug>/ worktree at origin/develop.
#   3. Creates branch <type>/<slug> tracking origin/develop.
#   4. Runs pnpm install in the new worktree.
#   5. Opens $EDITOR (defaults to `code`) at the worktree.
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source "$script_dir/_lib.sh"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <type> <slug>"
  echo "Types: ${BRANCH_PREFIXES[*]}"
  exit 2
fi

type="$1"
slug=$(sanitize_slug "$2")

if [ -z "$slug" ]; then
  echo "error: slug is empty after sanitisation" >&2
  exit 1
fi

validate_type "$type"

root=$(repo_root)
worktree_dir="${root%/}-${slug}"
branch="${type}/${slug}"

if [ -e "$worktree_dir" ]; then
  echo "error: $worktree_dir already exists" >&2
  exit 1
fi

cd "$root"
echo "Fetching origin…"
git fetch origin --quiet

echo "Creating worktree: $worktree_dir"
echo "Branch:             $branch"
echo "Base:               origin/develop"
confirm "Continue?" || { echo "Aborted."; exit 0; }

git worktree add -b "$branch" "$worktree_dir" origin/develop

echo "Installing dependencies…"
cd "$worktree_dir"
pnpm install

echo
echo "Ready:"
echo "  cd $worktree_dir"
echo "  git checkout $branch   (already on it)"
echo
open_editor "$worktree_dir"
