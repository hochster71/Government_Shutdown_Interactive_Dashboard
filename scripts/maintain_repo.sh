#!/usr/bin/env bash
set -euo pipefail

# maintain_repo.sh
#
# Safe, auditable maintainer tool to help keep the repo updated per maintainer direction.
# This script must be run by a human with admin rights. It DOES NOT exfiltrate secrets.
# It requires `gh` (GitHub CLI), `git`, `jq`, and Python3 for local tasks.
#
# Usage examples:
#   # Dry-run: show what would be done
#   ./scripts/maintain_repo.sh --pr 36 --dry-run
#
#   # Enable live auto-fix (set secret), rerun failing checks for the PR, wait, then merge
#   GH_TOKEN='<your PAT with repo, workflow scopes>' ./scripts/maintain_repo.sh --pr 36 --enable-auto-fix --rerun-checks --merge
#
# REQUIRED GH scopes for full automation (when using GH_TOKEN env):
#  - repo (full control of private repos)
#  - workflow (update GitHub Action workflows/rerun runs)
#
# Security notes:
#  - Do NOT hardcode tokens. Provide via environment variable GH_TOKEN or run `gh auth login` interactively.
#  - The script will ask for confirmation before performing actions that modify the repo or merge PRs.

REPO="${REPO:-$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")}" 
OWNER_REPO="${OWNER_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"

if [[ -z "$OWNER_REPO" ]]; then
  echo "Repository not detected via gh. Please run this from inside the repo or set OWNER_REPO env (owner/repo)."
  exit 1
fi

PR_NUMBER=""
DRY_RUN=false
ENABLE_AUTO_FIX=false
RERUN_CHECKS=false
DO_MERGE=false
TIMEOUT_MIN=20

usage(){
  sed -n '1,120p' "$0" | sed -n '1,120p'
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --pr) PR_NUMBER="$2"; shift 2;;
    --dry-run) DRY_RUN=true; shift;;
    --enable-auto-fix) ENABLE_AUTO_FIX=true; shift;;
    --rerun-checks) RERUN_CHECKS=true; shift;;
    --merge) DO_MERGE=true; shift;;
    --timeout) TIMEOUT_MIN="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

check_tools(){
  for t in gh git jq python3; do
    if ! command -v "$t" >/dev/null 2>&1; then
      echo "Required tool '$t' is missing. Please install it." >&2
      exit 1
    fi
  done
}

confirm(){
  if $DRY_RUN; then
    echo "DRY-RUN: $*"
    return 0
  fi
  read -r -p "$* [y/N] " resp
  case "$resp" in
    [yY]|[yY][eE][sS]) return 0;;
    *) return 1;;
  esac
}

gh_auth_check(){
  if ! gh auth status >/dev/null 2>&1; then
    if [[ -n "${GH_TOKEN:-}" ]]; then
      echo "Authenticating gh with GH_TOKEN from environment..."
      echo "$GH_TOKEN" | gh auth login --with-token >/dev/null 2>&1 || true
    fi
  fi
  if ! gh auth status >/dev/null 2>&1; then
    echo "gh is not authenticated. Run 'gh auth login' or set GH_TOKEN and retry." >&2
    exit 1
  fi
}

set_repo_secret_allow_auto_fix(){
  echo "Setting repository secret ALLOW_AUTO_FIX=true (requires admin rights)"
  if $DRY_RUN; then
    echo "DRY-RUN: gh secret set ALLOW_AUTO_FIX --repo $OWNER_REPO --body true"
    return 0
  fi
  gh secret set ALLOW_AUTO_FIX --repo "$OWNER_REPO" --body true
}

rerun_failing_runs_for_branch(){
  local branch="$1"
  echo "Searching failing workflow runs for branch: $branch"
  local runs
  runs=$(gh run list --branch "$branch" --json number,name,status,conclusion,workflowName,displayTitle --limit 50 | jq -r '.[] | select(.conclusion == "failure") | .number') || true
  if [[ -z "$runs" ]]; then
    echo "No failing runs found for branch $branch"
    return 0
  fi
  echo "Found failing runs: $runs"
  for r in $runs; do
    echo "Attempting to rerun run id: $r"
    if $DRY_RUN; then
      echo "DRY-RUN: gh run rerun $r --repo $OWNER_REPO"
    else
      set +e
      gh run rerun "$r" --repo "$OWNER_REPO"
      local rc=$?
      set -e
      if [[ $rc -ne 0 ]]; then
        echo "Failed to rerun run $r (insufficient permissions or run cannot be rerun)." >&2
      else
        echo "Rerun requested for run $r"
      fi
    fi
  done
}

wait_for_checks(){
  local branch="$1"
  local timeout_min="$2"
  local deadline=$(( $(date +%s) + timeout_min*60 ))
  echo "Waiting for required checks on branch '$branch' (timeout ${timeout_min}m)"
  while [[ $(date +%s) -lt $deadline ]]; do
    # List in-progress or failing runs
    local status
    status=$(gh run list --branch "$branch" --json name,status,conclusion --limit 50 | jq -r '[.[] | {name:.name,status:.status,conclusion:.conclusion}]')
    # If there's any run with status in_progress, keep waiting; if any run failed, return non-zero
    local any_in_progress
    any_in_progress=$(echo "$status" | jq -r 'map(select(.status=="in_progress")) | length')
    local any_failed
    any_failed=$(echo "$status" | jq -r 'map(select(.conclusion=="failure")) | length')
    if [[ "$any_failed" -gt 0 ]]; then
      echo "Detected failing checks."
      return 2
    fi
    if [[ "$any_in_progress" -gt 0 ]]; then
      echo "Checks in progress... sleeping 20s"
      sleep 20
      continue
    fi
    # No in-progress and no failed -> likely succeeded
    echo "No failing or in-progress runs detected; checks likely passed or none are required."
    return 0
  done
  echo "Timeout waiting for checks" >&2
  return 3
}

merge_pr(){
  local pr="$1"
  if $DRY_RUN; then
    echo "DRY-RUN: gh pr merge $pr --repo $OWNER_REPO --merge --delete-branch"
    return 0
  fi
  echo "Merging PR #$pr"
  gh pr merge "$pr" --repo "$OWNER_REPO" --merge --delete-branch || {
    echo "Merge failed (maybe protected branch checks)." >&2
    return 1
  }
}

run_local_tasks(){
  echo "Running local maintenance tasks: rss fetch & normalize (best-effort)"
  if $DRY_RUN; then
    echo "DRY-RUN: python3 scripts/fetch_rss.py"
    echo "DRY-RUN: python3 scripts/normalize_official.py"
    return 0
  fi
  python3 scripts/fetch_rss.py || echo "fetch_rss.py failed (non-fatal)"
  python3 scripts/normalize_official.py || echo "normalize_official.py failed (non-fatal)"
}

main(){
  check_tools
  gh_auth_check

  if [[ -z "$PR_NUMBER" ]]; then
    echo "No PR specified. Use --pr <number>. Exiting." >&2
    exit 1
  fi

  local head_branch
  head_branch=$(gh pr view "$PR_NUMBER" --repo "$OWNER_REPO" --json headRefName -q .headRefName) || true
  echo "PR #$PR_NUMBER head branch: $head_branch"

  if $ENABLE_AUTO_FIX; then
    if confirm "Set repository secret ALLOW_AUTO_FIX=true to enable live auto-fix?"; then
      set_repo_secret_allow_auto_fix
    else
      echo "Skipped enabling auto-fix.";
    fi
  fi

  if $RERUN_CHECKS; then
    if confirm "Attempt to rerun failing workflow runs on branch $head_branch?"; then
      rerun_failing_runs_for_branch "$head_branch"
      echo "Waiting for checks to settle (timeout ${TIMEOUT_MIN}m)"
      wait_for_checks "$head_branch" "$TIMEOUT_MIN" || echo "Checks did not all pass; merge may be blocked."
    else
      echo "Skipped rerunning checks.";
    fi
  fi

  run_local_tasks

  if $DO_MERGE; then
    if confirm "Merge PR #$PR_NUMBER now?"; then
      merge_pr "$PR_NUMBER" || echo "Merge failed or blocked by protection rules."
    else
      echo "Skipped merge.";
    fi
  fi

  echo "Done."
}

main
