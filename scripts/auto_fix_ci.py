#!/usr/bin/env python3
"""
Automated CI-failure fixer (safe fixes only)

Current strategies implemented:
- Lint fixes: run ESLint with --fix in frontend/ and backend/ (if eslint present)
- Audit fixes: run `npm audit fix --package-lock-only` at repo root (non-destructive)

This script is intentionally conservative. By default it runs in dry-run mode and reports changes it would make.
To allow pushing fixes to the PR branch set env LIVE=true and provide a GitHub token with write permission (GITHUB_TOKEN).

Usage (from CI):
  python3 scripts/auto_fix_ci.py --pr-number 123 --dry-run

The workflow will find the PR number associated with the failing commit and invoke this script.
"""

import argparse
import os
import subprocess
import sys
import json


def run(cmd, cwd=None, check=True):
    print(f"RUN: {' '.join(cmd)} (cwd={cwd})")
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    print(r.stdout)
    if r.stderr:
        print(r.stderr, file=sys.stderr)
    if check and r.returncode != 0:
        raise subprocess.CalledProcessError(r.returncode, cmd, output=r.stdout, stderr=r.stderr)
    return r.returncode, r.stdout + r.stderr


def has_eslint(path):
    return os.path.exists(os.path.join(path, 'package.json')) and os.path.isdir(path)


def git_commit_and_push(message, live):
    # Stage all changes
    run(['git', 'add', '-A'])
    # Check if anything to commit
    code, out = run(['git', 'status', '--porcelain'], check=False)
    if out.strip() == '':
        print('No changes to commit.')
        return False
    run(['git', 'commit', '-m', message])
    if live:
        run(['git', 'push'])
        return True
    else:
        print('Dry-run mode: would push commit, but not pushing.')
        return True


def try_lint_fix(repo_root, live):
    changed = False
    # Try frontend and backend
    for sub in ('frontend', 'backend'):
        path = os.path.join(repo_root, sub)
        pkg = os.path.join(path, 'package.json')
        if os.path.exists(pkg):
            # If eslint is available via node_modules/.bin or npx eslint
            print(f'Attempting eslint --fix in {sub}')
            try:
                # Prefer npx so we use repo-local eslint
                run(['npx', '--yes', 'eslint', '--version'], cwd=repo_root, check=False)
            except Exception:
                pass
            try:
                # Run eslint --fix for . and exit code may be non-zero; allow check=False
                run(['npx', '--yes', 'eslint', '--ext', '.ts,.tsx,.js,.jsx', sub, '--fix'], cwd=repo_root, check=False)
                changed = True
            except Exception as e:
                print(f'eslint run error in {sub}: {e}', file=sys.stderr)
    return changed


def try_audit_fix(repo_root, live):
    # Non-destructive: update package-lock.json with fixes
    print('Attempting npm audit fix --package-lock-only')
    try:
        run(['npm', 'ci'], cwd=repo_root, check=False)
    except Exception:
        print('npm ci failed or skipped (best-effort).', file=sys.stderr)
    try:
        run(['npm', 'audit', 'fix', '--package-lock-only'], cwd=repo_root, check=False)
        return True
    except Exception as e:
        print('npm audit fix failed:', e, file=sys.stderr)
        return False


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--pr-number', type=int, required=True)
    p.add_argument('--dry-run', action='store_true', default=False)
    args = p.parse_args()

    live = not args.dry_run and os.environ.get('LIVE', 'false').lower() in ('1', 'true', 'yes') and os.environ.get('ALLOW_AUTO_FIX', 'false').lower() in ('1', 'true', 'yes')

    print('Auto-fix CI invoked for PR', args.pr_number, 'live=', live)

    # Checkout the PR branch locally using gh
    try:
        run(['gh', 'pr', 'checkout', str(args.pr_number)])
    except Exception as e:
        print('Failed to checkout PR branch:', e, file=sys.stderr)
        sys.exit(1)

    repo_root = os.getcwd()

    any_change = False
    # 1) Lint fixes
    try:
        lint_changed = try_lint_fix(repo_root, live)
        any_change = any_change or lint_changed
    except Exception as e:
        print('Lint-fix step failed:', e, file=sys.stderr)

    # 2) Audit fix
    try:
        audit_changed = try_audit_fix(repo_root, live)
        any_change = any_change or audit_changed
    except Exception as e:
        print('Audit-fix step failed:', e, file=sys.stderr)

    if any_change:
        committed = git_commit_and_push('chore(ci): apply automated safe fixes (lint/audit)', live)
        if committed:
            print('Committed fixes. live=', live)
            # Post a comment on the PR
            comment = 'Automated CI-fix: applied safe fixes (lint/audit). ' + ('Pushed changes to branch.' if live else 'Dry-run — changes were committed locally but not pushed.')
            run(['gh', 'pr', 'comment', str(args.pr_number), '--body', comment], check=False)
    else:
        print('No automatic fixes applied.')
        run(['gh', 'pr', 'comment', str(args.pr_number), '--body', 'Automated CI-fix ran but found no safe fixes to apply.'], check=False)


if __name__ == '__main__':
    main()
