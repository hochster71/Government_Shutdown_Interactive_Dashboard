Title: upgrade: backend core libs (helmet, node-cron) + re-enable frontend lint

Summary:
- This branch prepares backend core upgrades and tightened frontend linting.
- Re-enabled strict ESLint rules in `frontend/.eslintrc.cjs` — some fixes may be required.

What to review:
- CI results for frontend lint and backend tests.
- Any lint errors are saved in `frontend-lint-output.txt` in the repo root if present.

Next steps (recommended):
1. Fix any frontend lint errors (if present) on this branch.
2. Upgrade backend libs (`helmet`, `node-cron`) one at a time and run backend tests.
3. Open follow-up PRs for `express@5` migration separately.

Notes:
- This PR is a draft to allow CI to run and for reviewers to inspect issues before merging.
