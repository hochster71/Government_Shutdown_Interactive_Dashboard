Batching policy for automatic merging

Goal
- Speed up safe merges while maintaining CI/branch-protection checks.

Policy
- Default batch size: 5 PRs.
- Eligibility for batching:
  - PR is open and not a draft
  - PR mergeable status is `MERGEABLE`
  - No existing auto-merge request
  - Exclude PRs that change sensitive areas (auth, deployment workflows, schema migrations) — those must be handled individually.

Process
1. Collect eligible PRs and order by PR number (oldest first).
2. Group into batches of up to 5 PRs.
3. For each PR in the batch:
   - Enable auto-merge (GH CLI: `gh pr merge <n> --auto --merge --delete-branch`).
   - If scheduling fails, log the error and continue.
4. Monitor auto-merge watcher for merges and CI job results.
5. If a PR in the batch fails CI after merge, collect logs and attempt minimal safe fixes (lint/type/dependency pin) or open a follow-up PR.

Exceptions
- Any PR that is labelled `high-risk`, touches `backend/server.js` or `backend/package.json`, or modifies infra/workflows must be excluded from automatic batching unless explicitly approved.

Automation
- `scripts/apply_batching.py` implements the above policy and can be run with `--batch-size` and `--dry-run` flags.
- The watcher (`scripts/watch_bg.py`) monitors merges and logs results.
