#!/usr/bin/env python3
"""
Batching script: group mergeable PRs and enable auto-merge in batches.

Usage: python3 scripts/apply_batching.py [--batch-size N] [--dry-run]

This script will:
 - Find open PRs that are mergeable (mergeable == "MERGEABLE"), not drafts, and have no autoMergeRequest
 - Group them into batches of up to `batch_size` PRs
 - For each PR in the batch, enable auto-merge (gh pr merge --auto --merge --delete-branch ...)

It logs actions to stdout; errors are printed but do not stop the run.

NOTE: Enabling auto-merge respects repository branch protection; if the PR is blocked, the CLI will schedule auto-merge and it will apply when checks pass.
"""

import argparse
import json
import subprocess
import sys


def run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return (0, r.stdout.strip())
    except subprocess.CalledProcessError as e:
        return (e.returncode, e.stderr.strip() or e.stdout.strip())


def list_candidate_prs():
    cmd = ['gh', 'pr', 'list', '--state', 'open', '--json', 'number,title,mergeable,isDraft,autoMergeRequest,headRefName,baseRefName,mergeStateStatus']
    code, out = run(cmd)
    if code != 0:
        print('ERROR: gh pr list failed:', out, file=sys.stderr)
        return []
    try:
        arr = json.loads(out)
    except Exception as e:
        print('ERROR: failed to parse gh pr list output:', e, file=sys.stderr)
        return []
    candidates = []
    for pr in arr:
        if pr.get('isDraft'):
            continue
        if pr.get('autoMergeRequest') is not None:
            continue
        if pr.get('mergeable') != 'MERGEABLE':
            continue
        candidates.append(pr)
    return candidates


def enable_auto_merge(pr_number, subject=None, body=None, dry_run=False):
    subject_arg = ['--subject', subject] if subject else []
    body_arg = ['--body', body] if body else []
    cmd = ['gh', 'pr', 'merge', str(pr_number), '--auto', '--merge', '--delete-branch'] + subject_arg + body_arg
    if dry_run:
        print('[dry-run] would run:', ' '.join(cmd))
        return True, '(dry-run)'
    code, out = run(cmd)
    if code == 0:
        return True, out
    return False, out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--batch-size', type=int, default=5)
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    candidates = list_candidate_prs()
    if not candidates:
        print('No eligible PRs found to batch.')
        return

    print(f'Found {len(candidates)} eligible PR(s). Batch size {args.batch_size}.')
    # sort to make behavior deterministic (by number ascending)
    candidates.sort(key=lambda x: x.get('number'))

    batches = [candidates[i:i+args.batch_size] for i in range(0, len(candidates), args.batch_size)]
    for bi, batch in enumerate(batches, start=1):
        print(f'Processing batch {bi}/{len(batches)}: {[p.get("number") for p in batch]}')
        for pr in batch:
            num = pr.get('number')
            title = pr.get('title')
            head = pr.get('headRefName')
            base = pr.get('baseRefName')
            subj = f'Batch auto-merge: PR #{num} {head} -> {base}'
            body = 'Scheduled by batching script.'
            ok, out = enable_auto_merge(num, subject=subj, body=body, dry_run=args.dry_run)
            if ok:
                print(f'  Scheduled auto-merge for PR #{num} ({title})')
            else:
                print(f'  FAILED to schedule PR #{num}: {out}', file=sys.stderr)
        print('Batch completed. Waiting briefly before next batch...')
        # small pause to avoid API burst
        time.sleep(2)

if __name__ == '__main__':
    import time
    main()
