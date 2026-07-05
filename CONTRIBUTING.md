# Contributing to confiddo-website

The web app (`app/`) is a Vite + React 19 + TypeScript SPA served at confiddo.in/app.

## The rule that matters most
**Every change reaches `main`/`dev` through a Pull Request that passes CI and has at least
one approving review from a core owner. Direct pushes to `main`/`dev` are disabled.**

## Set your git identity (once)
```bash
git config user.name  "Your Name"
git config user.email "you@example.com"
```

## Branch naming
`feat/<desc>` · `fix/<desc>` · `chore/<desc>` — branch off `dev`, keep PRs small.

## Local setup
```bash
cd app
npm ci
cp .env.example .env      # fill in local values; NEVER commit app/.env or real secrets
npm run dev               # local dev server
```
`VITE_*` vars are inlined into the client bundle at build time, so they must be **non-secret**
(public config only). Never store passwords or long-lived tokens in code or `localStorage`.

## What CI checks on your PR (all required)
```bash
npm run typecheck   # tsc -b
npm run lint        # eslint
npm test            # vitest (parity suite)
npm run build       # vite build
```
Plus a `gitleaks` secret-scan on new commits. Run these locally before pushing.

## Sensitive areas
Changes to `app/src/lib/api/` (API client) or auth/token handling always require a core-owner
review (see `.github/CODEOWNERS`).

## Security
Report vulnerabilities privately to the core team — do not open a public issue.
