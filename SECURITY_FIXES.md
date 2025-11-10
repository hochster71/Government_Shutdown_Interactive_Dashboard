Security fixes and verification

Summary
-------
This change addressed npm-audit-reported vulnerabilities found in the project dependencies.

What I changed
---------------
- frontend/package.json
  - Bumped `vite` to `^7.2.2` to pull in a fixed `esbuild` (resolves CVE described by npm audit).
- backend/package.json
  - Bumped `pino` to `^10.1.0` and `pino-http` to `^11.0.0` to remove a transitive `fast-redact` prototype-pollution vulnerability.
  - Kept `pino-pretty` at the existing version to minimize risk; tests and functionality verified.

Why these changes
------------------
- npm audit reported moderate vulnerabilities in `esbuild` (affecting Vite) and low-severity issues in the pino logging chain (via `fast-redact`). The recommended fixes required semver-major bumps.
- Upgrading these dev/prod dependencies reduces attack surface and addresses known advisories.

Verification performed
----------------------
- Ran `npm install` for all workspaces using the repo script.
- Ran `npm audit` in `backend` and `frontend` after updates — both show zero vulnerabilities.
- Ran unit tests in `backend` (Jest) — all tests passed (25/25).
- Built the frontend (`npm run build`) — build completed successfully.

Quick reproduction
------------------
To reproduce the steps locally (from repo root):

```bash
# install deps for all workspaces
npm run install:all

# run audits
(cd backend && npm audit)
(cd frontend && npm audit)

# backend tests
(cd backend && npm test)

# frontend build
(cd frontend && npm run build)
```

Follow-ups / notes
------------------
- Upgrading `pino` and `vite` were semver-major changes. While tests and builds passed locally, these are significant upgrades and should be observed in staging/CI for regressions.
- Consider upgrading `pino-pretty` to a major release aligned with `pino@10` in a follow-up if additional formatting or features are desired.
- Consider adding an automated weekly `npm audit` job in CI to catch drift.

If you'd like, I can:
- Open a PR with these changes and a short description for review.
- Bump `pino-pretty` or perform additional code-level hardening (e.g., CSP tightening for production) as a follow-up.
