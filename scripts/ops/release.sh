#!/usr/bin/env bash
# release.sh — start a release/<version> branch from origin/staging.
#
# Usage:
#   ./scripts/ops/release.sh <semver>
#   ./scripts/ops/release.sh 1.2.0
#
# Effect:
#   1. Fetches origin.
#   2. Bumps apps/mobile/app.json `version` to <semver>.
#   3. Creates ~/Desktop/DEV_Local/borkd/release-v<version>/ worktree
#      at origin/staging.
#   4. Creates branch release/v<version>.
#   5. Commits the version bump.
#   6. Opens $EDITOR.
#
# From here: push the branch and open a PR to main. Merge triggers
# EAS production build + Supabase production migrations (once CI vars
# are enabled).
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source "$script_dir/_lib.sh"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <semver>"
  echo "  e.g. $0 1.2.0"
  exit 2
fi

version="$1"
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "error: '$version' is not semver (X.Y.Z[-prerelease])" >&2
  exit 1
fi

root=$(repo_root)
# root is .../borkd/main; release siblings live as .../borkd/release-v<semver>.
worktree_dir="${root%/main}/release-v${version}"
branch="release/v${version}"

if [ -e "$worktree_dir" ]; then
  echo "error: $worktree_dir already exists" >&2
  exit 1
fi

cd "$root"
echo "Fetching origin…"
git fetch origin --quiet

echo "Creating release worktree"
echo "Worktree: $worktree_dir"
echo "Branch:   $branch"
echo "Base:     origin/staging"
echo "Version:  $version"
confirm "Continue?" || { echo "Aborted."; exit 0; }

git worktree add -b "$branch" "$worktree_dir" origin/staging
cd "$worktree_dir"

# Bump version in apps/mobile/app.json
node -e "
  const fs = require('fs');
  const path = 'apps/mobile/app.json';
  const j = JSON.parse(fs.readFileSync(path, 'utf8'));
  j.expo.version = '$version';
  fs.writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
  console.log('Bumped apps/mobile/app.json version → $version');
"

git add apps/mobile/app.json
git commit -m "chore(release): bump mobile version to v${version}

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

echo "Installing dependencies…"
pnpm install

cat <<EOF

Release branch ready:
  cd $worktree_dir

Next steps:
  1. Review diff: staging → main will promote.
     git log --oneline origin/main..HEAD
  2. Smoke-test staging QA (TestFlight / Play Internal).
  3. Push + open PR:
     git push -u origin $branch
     gh pr create --base main --head $branch --title "release: v${version}"
  4. After merge, tag:
     git checkout main && git pull
     git tag v${version} && git push origin v${version}

EOF
open_editor "$worktree_dir"
