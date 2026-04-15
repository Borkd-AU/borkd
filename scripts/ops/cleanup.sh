#!/usr/bin/env bash
# cleanup.sh — list + remove worktrees for branches already merged to develop.
#
# Usage:
#   ./scripts/ops/cleanup.sh              # interactive, dry-run default
#   ./scripts/ops/cleanup.sh --yes        # skip prompts
#   ASSUME_YES=true ./scripts/ops/cleanup.sh
#
# Does not touch:
#   * main worktree (reference clone)
#   * worktrees whose branches are NOT merged to origin/develop
#   * dirty worktrees (uncommitted changes)
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source "$script_dir/_lib.sh"

if [ "${1:-}" = "--yes" ]; then
  export ASSUME_YES=true
fi

root=$(repo_root)
cd "$root"

echo "Fetching origin…"
git fetch origin --quiet --prune

# Parse worktree list (porcelain is stable, newline-separated records).
mapfile -t worktree_lines < <(git worktree list --porcelain)

# Build array of (path, branch) pairs; skip the main one.
to_check=()
current_path=""
for line in "${worktree_lines[@]}"; do
  case "$line" in
    "worktree "*) current_path="${line#worktree }" ;;
    "branch "*)
      current_branch="${line#branch refs/heads/}"
      # Skip the reference clone.
      if [ "$current_path" = "$root" ]; then
        continue
      fi
      to_check+=("$current_path|$current_branch")
      ;;
  esac
done

if [ ${#to_check[@]} -eq 0 ]; then
  echo "No worktrees to check."
  exit 0
fi

echo
echo "Candidate worktrees:"
removed=0
for entry in "${to_check[@]}"; do
  path="${entry%%|*}"
  branch="${entry##*|}"

  # Dirty? skip.
  if [ -n "$(git -C "$path" status --porcelain 2>/dev/null || true)" ]; then
    echo "  [dirty]  $path  ($branch) — uncommitted changes, skipped"
    continue
  fi

  # Unpushed commits?
  local_head=$(git -C "$path" rev-parse HEAD)
  upstream=$(git -C "$path" rev-parse "origin/${branch}" 2>/dev/null || echo "")

  # Merged into develop?
  if git merge-base --is-ancestor "$local_head" origin/develop 2>/dev/null; then
    status="merged"
  else
    status="unmerged"
  fi

  if [ "$status" = "unmerged" ]; then
    echo "  [unmerged] $path  ($branch) — not on origin/develop, skipped"
    continue
  fi

  echo "  [ready]  $path  ($branch) — merged to develop, safe to remove"
  if confirm "    Remove $path and delete branch $branch?"; then
    git worktree remove "$path"
    git branch -D "$branch" 2>/dev/null || true
    git push origin --delete "$branch" 2>/dev/null || true
    removed=$((removed + 1))
    echo "    ✓ removed"
  else
    echo "    skipped"
  fi
done

echo
echo "Cleanup done — $removed worktree(s) removed."
git worktree list
