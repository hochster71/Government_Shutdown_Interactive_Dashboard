Title: chore: upgrade deps to fix security advisories

Summary
- Upgrades applied in this branch:
  - backend: `pino@10.x`, `pino-http@11.x`, `pino-pretty@13.x`, `jest@30.x`, `supertest@7.x`
  - frontend: `vite@7.x`

Motivation
- These upgrades resolve `npm audit` advisories (fast-redact and esbuild) and remove reported moderate/low vulnerabilities.

What I tested
- Backend: ran Jest test suite (3 suites, 25 tests) — all passed.
- Frontend: ran `npm run lint` and `npm run build` — build succeeded; lint shows a TypeScript version warning only.
- Saved post-upgrade audit reports: `backend-audit-upgraded.json`, `frontend-audit-upgraded.json` (zero vulnerabilities).

Notes & Recommendations
- The branch is intentionally limited to these upgrades to reduce risk. Other major upgrades (Express 5, React 19, etc.) should be done in separate branches.
- Re-enable stricter ESLint/TypeScript rules and fix `any` types in follow-up PRs.
- Consider enabling SCA (Dependabot is configured) and adding GH Actions to fail on high/critical audits.

Files changed (high level)
- `backend/package.json` (devDeps and deps updated)
- `frontend/package.json` (vite updated)
- `.github/dependabot.yml` added
- `SECURITY_REPORT.md` added

CI
- CI workflow already present and will run lint/tests/build on PRs.

Next steps
- (Optional) Attempt controlled upgrades for Express, node-cron, helmet in a separate branch.
- (Optional) Re-enable stricter lint rules and migrate `any` usages.

Please review and merge when ready. If you want, I can open this PR as a draft using the GitHub CLI; run `gh auth login` and then execute:

```
gh pr create --title "chore: upgrade deps to fix security advisories" --body-file PR_BODY.md --base main --head chore/upgrade-deps --draft
```

Or open in the browser:
https://github.com/hochster71/Government_Shutdown_Interactive_Dashboard/pull/new/chore/upgrade-deps
