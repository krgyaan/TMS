#!/usr/bin/env bash
# sync-upstream.sh
# Syncs your current branch with an upstream repo's branch, safely.
# Works in Git Bash on Windows, or any bash/WSL/Linux/macOS shell.
#
# USAGE:
#   ./sync-upstream.sh                 -> merges upstream/main into current branch
#   ./sync-upstream.sh main            -> merges upstream/main into current branch
#   ./sync-upstream.sh feat/operation  -> merges upstream/feat/operation into current branch
#
# WHAT IT DOES:
#   1. Checks that 'upstream' remote exists (adds it if you set UPSTREAM_URL below)
#   2. Fetches latest upstream commits
#   3. Refuses to run if you have uncommitted changes (asks you to commit/stash first)
#   4. Merges upstream/<branch> into your CURRENT branch
#   5. If conflicts happen, stops and tells you exactly what to do next
#   6. If merge succeeds cleanly, asks whether to push to origin

set -e  # stop immediately on unexpected errors

# ---- CONFIG: change this once, reuse forever ----
UPSTREAM_URL="https://github.com/krgyaan/tms.git"
UPSTREAM_BRANCH="${1:-main}"   # defaults to 'main' if no argument given
# --------------------------------------------------

echo "==> Checking repo..."
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "ERROR: Not inside a git repository. cd into your project folder first."
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

echo "==> Checking 'upstream' remote..."
if ! git remote get-url upstream > /dev/null 2>&1; then
  echo "'upstream' remote not found. Adding it now: $UPSTREAM_URL"
  git remote add upstream "$UPSTREAM_URL"
else
  echo "'upstream' remote already configured: $(git remote get-url upstream)"
fi

echo "==> Checking working tree is clean..."
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: You have uncommitted changes. Commit or stash them first:"
  echo "   git stash"
  echo "then re-run this script."
  exit 1
fi

echo "==> Fetching upstream..."
git fetch upstream

echo "==> Verifying upstream/$UPSTREAM_BRANCH exists..."
if ! git show-ref --verify --quiet "refs/remotes/upstream/$UPSTREAM_BRANCH"; then
  echo "ERROR: 'upstream/$UPSTREAM_BRANCH' does not exist."
  echo "Available upstream branches:"
  git branch -r | grep upstream
  exit 1
fi

echo "==> Merging upstream/$UPSTREAM_BRANCH into $CURRENT_BRANCH..."
if git merge "upstream/$UPSTREAM_BRANCH" -m "Merge upstream/$UPSTREAM_BRANCH into $CURRENT_BRANCH"; then
  echo ""
  echo "SUCCESS: Merge completed with no conflicts."
  read -p "Push $CURRENT_BRANCH to origin now? [y/N] " PUSH_CONFIRM
  if [[ "$PUSH_CONFIRM" =~ ^[Yy]$ ]]; then
    git push origin "$CURRENT_BRANCH"
    echo "Pushed to origin/$CURRENT_BRANCH."
  else
    echo "Skipped push. Run 'git push origin $CURRENT_BRANCH' manually when ready."
  fi
else
  echo ""
  echo "MERGE CONFLICT(S) DETECTED."
  echo "Conflicted files:"
  git diff --name-only --diff-filter=U
  echo ""
  echo "Next steps:"
  echo "  1. Open each conflicted file, resolve the <<<<<<< ======= >>>>>>> markers"
  echo "  2. git add <resolved-file>   (repeat for each file)"
  echo "  3. git commit                (finishes the merge)"
  echo "  4. git push origin $CURRENT_BRANCH"
  echo ""
  echo "If you want to cancel and go back to before the merge instead, run:"
  echo "  git merge --abort"
  exit 1
fi
