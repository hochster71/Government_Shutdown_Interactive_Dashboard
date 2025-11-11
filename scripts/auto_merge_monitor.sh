#!/usr/bin/env bash
set -euo pipefail

# auto_merge_monitor.sh
# Poll GitHub Actions for a branch and auto-merge the given PR when checks pass.
# Usage: ./scripts/auto_merge_monitor.sh --pr 36 --repo owner/repo --branch copilot/add-auto-fix --timeout-min 30

PR=36
REPO="hochster71/Government_Shutdown_Interactive_Dashboard"
BR="copilot/add-auto-fix"
TIMEOUT_MIN=30

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --pr) PR="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --branch) BR="$2"; shift 2;;
    --timeout-min) TIMEOUT_MIN="$2"; shift 2;;
    -h|--help) echo "Usage: $0 [--pr N] [--repo owner/repo] [--branch name] [--timeout-min M]"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

END=$(( $(date +%s) + TIMEOUT_MIN * 60 ))
echo "Monitoring branch '$BR' in repo '$REPO' for up to ${TIMEOUT_MIN} minutes. PR #$PR will be merged when checks pass."

while [[ $(date +%s) -lt $END ]]; do
  echo "Checking at $(date -u '+%Y-%m-%dT%H:%M:%SZ') UTC..."
  in_progress=$(gh run list --repo "$REPO" --branch "$BR" --limit 50 --json status --jq '.[] | select(.status=="in_progress") | .status' | wc -l || true)
  failures=$(gh run list --repo "$REPO" --branch "$BR" --limit 50 --json conclusion --jq '.[] | select(.conclusion=="failure") | .conclusion' | wc -l || true)
  pending_nulls=$(gh run list --repo "$REPO" --branch "$BR" --limit 50 --json conclusion --jq '.[] | select(.conclusion==null) | .conclusion' | wc -l || true)
  echo "in_progress=$in_progress failures=$failures pending_nulls=$pending_nulls"

  if [[ "$in_progress" -eq 0 && "$failures" -eq 0 ]]; then
    echo "No in-progress runs and no failures detected. Attempting to merge PR #$PR..."
    if gh pr merge "$PR" --repo "$REPO" --merge --delete-branch --subject "Merge PR #$PR: copilot/add-auto-fix (auto-merged)" --body "Auto-merged after checks passed."; then
      echo "Merge succeeded."; exit 0
    else
      echo "Merge command failed (likely branch protection)."; exit 2
    fi
  fi

  echo "Waiting 15s before re-check..."
  sleep 15
done

echo "Timeout (${TIMEOUT_MIN}m) reached waiting for checks to pass; no merge performed."; exit 3
