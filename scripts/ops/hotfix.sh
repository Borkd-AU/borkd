#!/usr/bin/env bash
# hotfix.sh — create a hotfix worktree from origin/main.
#
# Usage:
#   ./scripts/ops/hotfix.sh <slug>
#   ./scripts/ops/hotfix.sh mapbox-token-rotation
#
# Differences vs. new-branch.sh:
#   * Forks from origin/main (not develop) — hotfix lands back on main.
#   * Branch name: hotfix/<slug>.
#   * Worktree dir: ~/Desktop/DEV_Local/borkd/hotfix-<slug>/ — the
#     "hotfix-" prefix makes urgency obvious when tab-completing, and
#     the file lives alongside the other worktrees inside the borkd/
#     grouping directory.
#
# After merging to main, back-merge into develop + staging manually
# (see docs/HOTFIX.md §11).
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source "$script_dir/_lib.sh"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <slug>"
  exit 2
fi

slug=$(sanitize_slug "$1")

if [ -z "$slug" ]; then
  echo "error: slug empty after sanitisation" >&2
  exit 1
fi

root=$(repo_root)
# root is .../borkd/main; hotfix siblings live as .../borkd/hotfix-<slug>.
worktree_dir="${root%/main}/hotfix-${slug}"
branch="hotfix/${slug}"

if [ -e "$worktree_dir" ]; then
  echo "error: $worktree_dir already exists" >&2
  exit 1
fi

cd "$root"
echo "Fetching origin…"
git fetch origin --quiet

echo "🚨 Creating HOTFIX worktree"
echo "Worktree: $worktree_dir"
echo "Branch:   $branch"
echo "Base:     origin/main  (not develop — hotfix targets main)"
confirm "Continue?" || { echo "Aborted."; exit 0; }

git worktree add -b "$branch" "$worktree_dir" origin/main

echo "Installing dependencies…"
cd "$worktree_dir"
pnpm install

cat <<EOF

Hotfix worktree ready:
  cd $worktree_dir

Next steps (see docs/HOTFIX.md for full 12-step playbook):
  1. Write a failing test that reproduces the bug.
  2. Minimal fix only — no refactors, no scope creep.
  3. pnpm turbo lint check test
  4. Commit with 'hotfix for SEV<N> incident <slack-thread>' in body.
  5. gh pr create --base main --head $branch
  6. After merge: back-merge main → develop + staging.

EOF
open_editor "$worktree_dir"
