#!/usr/bin/env bash
# Shared helpers for scripts/ops/*.sh. Source this with:
#   source "$(dirname "$0")/_lib.sh"
# Never execute directly.
set -euo pipefail

# Absolute path to the repo root reference clone.
# All worktrees live as siblings of this directory.
REPO_ROOT_DEFAULT="${HOME}/Desktop/DEV_Local/borkd"

# Detect the repo root the script was invoked from. The script may run
# from any worktree; we always return the MAIN clone path (where
# worktrees live as ../borkd-<slug>).
repo_root() {
  local cwd
  cwd=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
  if [ -z "$cwd" ]; then
    echo "$REPO_ROOT_DEFAULT"
    return
  fi
  # If we're already in a worktree, the main clone is the one whose
  # .git is a directory (not a file pointing elsewhere).
  local main
  main=$(git worktree list --porcelain | awk '/^worktree/{print $2; exit}')
  echo "${main:-$REPO_ROOT_DEFAULT}"
}

# Allowed branch prefixes (matches docs/GIT_WORKFLOW.md + CI branch-policy).
BRANCH_PREFIXES=(feat feat-exp fix ui chore refactor perf docs test style build ci)

validate_type() {
  local type="$1"
  for allowed in "${BRANCH_PREFIXES[@]}"; do
    [ "$type" = "$allowed" ] && return 0
  done
  echo "error: unknown branch type '$type'" >&2
  echo "  allowed: ${BRANCH_PREFIXES[*]}" >&2
  return 1
}

# Strip any accidental path separators / uppercase.
sanitize_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | sed 's/^-*//;s/-*$//'
}

# Confirm interactively unless --yes flag was passed.
confirm() {
  local prompt="$1"
  if [ "${ASSUME_YES:-false}" = "true" ]; then
    return 0
  fi
  read -r -p "$prompt [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

# Launch $EDITOR (defaults to code) in the new worktree.
open_editor() {
  local dir="$1"
  local editor="${EDITOR:-code}"
  if command -v "$editor" >/dev/null 2>&1; then
    "$editor" "$dir" >/dev/null 2>&1 || true
  fi
}
