# confiddo.in — Landing page + Confiddo Web App

This repo hosts two things, side by side:

| Path | What it is |
|---|---|
| `/` (repo root: `index.html`, `privacy.html`, `favicon.svg`, `CNAME`) | The existing static landing page at https://confiddo.in — **unchanged** |
| `app/` | The Confiddo **web app**: a Vite + React 19 + TypeScript + Tailwind v4 SPA, served under `https://confiddo.in/app/` (`vite.config.ts` sets `base: '/app/'`, the router uses `basename: '/app'`) |
| `ARCHITECTURE.md` | The **parity contract** — code-verified map of the Android app's backend logic (metrics formulas, readiness gates, XP economy, API surface) that the web app mirrors. Read this first. |

The web app is a **native web client for the same backend the Android app uses**
(`https://conf007--confiddo-backend-fastapi-app.modal.run/v1`). No schema forks, no parallel
endpoints: a user sees identical data in the app and on the web. All metrics, readiness and XP
computation stays server-side; the TypeScript ports in `app/src/lib/parity/` exist for display
and verification only.

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:5173/app/
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` + production build into `app/dist/` |
| `npm run lint` | ESLint (0 errors expected) |
| `npm test` | Vitest — 185 parity tests pinning backend formulas |
| `npm run typecheck` | TypeScript only |

### Environment variables (all optional, `app/.env.local`)

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | the production Modal URL + `/v1` | Point at a local/staging backend |
| `VITE_ENABLE_CLASS_RANKINGS` | off | Privacy-flagged XP leaderboards (see "Open product questions") |

## What's done

- **Auth, all roles** — role-picker login (student / teacher / parent / principal), teacher
  invite-code registration, parent registration, 3-step OTP forgot-password, forgot-username,
  mandatory first-login password change + email OTP, JWT refresh with single-flight 401 retry,
  parent `device_id` for the 2-device cap.
- **Student** — home with tests by subject and resume; the full 8-call test attempt flow
  (hints that teach approach, persistence choice with server anti-spoofing, progressive
  solution reveal, curiosity tracking, >30s app-switch counting via `visibilitychange`,
  review-before-finish); XP breakdown reveal with streak/level-up moments; results review;
  progress (readiness as words, self-comparison only); 16 derived badges; character
  collection with client-side XP gates; parent linking; XP rules explainer (backend values).
- **Teacher** — class list/overview, question-bank paper builder (10-slot model), test
  status/detail, review queue with readiness validation (agree/same/adjust + bulk), student
  detail (trend/notes/flags/interventions), analytics, parent messages, notification prefs.
- **Parent** — children home + device heartbeat, weekly narrative summary + shareable growth
  cards (copy / WhatsApp), paged 4-week + full-journey readiness grids, activity feed,
  engagement dashboard, conversation starters, home goals, learning insights (qualitative
  effort bars), monthly report, achievements, readiness explainer, exam guide, devices,
  link-child, profile + email change. **No scores, no percentages, no peer comparison.**
- **Principal** — school dashboard, class×subject readiness heatmap (aggregate counts only),
  class detail with confidence metrics + notify-teacher, teacher directory with approval
  queue / invite codes / password reset / deactivation, paginated student search + student
  detail (tests, behavior words, journey), profile.
- **Notifications** — in-app center per role (history, mark read/all, paging) + header bell
  polling unread-count every 60 s.
- **Parity tests** — `app/src/lib/parity/` ports every pure backend formula (15 behavioral
  metrics, L1–L5 readiness gates, weighted accuracy, theta, XP pipeline, weekly banker's
  rounding, character gates) with 185 pinned-value tests (`npm test`).

## Gaps & assumptions (flagged, not guessed)

Full list with file/line references in `ARCHITECTURE.md` §9. The ones that matter most:

1. **Class rankings are feature-flagged OFF** (`VITE_ENABLE_CLASS_RANKINGS`). The backend
   exposes named XP leaderboards (`/student/class-rankings`, parent class-ranking), which
   tensions the product's "no peer leaderboards" stance. Product must decide; the UI shows a
   self-progress view instead until then.
2. **Web push (FCM) not wired** — backend token storage supports `device_type: "web"`, but
   the repo has no Firebase *web* app config/VAPID key. In-app polling covers MVP.
3. **Admin panel not ported** — it's intentionally Flutter Web in the app monorepo and stays
   there; the web app covers the four user-facing roles.
4. **Character XP gate is client-side only** (server validates the ID, not the XP) — ported
   faithfully; server-side hardening recommended.
5. **CORS is `allow_origins=["*"]`** on the backend today; restrict to `confiddo.in` +
   localhost before launch.
6. **Curiosity-bonus copy** — backend awards +1 (the web explainer says +1); the Flutter
   explainer claims +3. Backend wins; the Flutter copy needs the fix.
7. Logout is stateless (7-day refresh tokens stay valid server-side) — acceptable for MVP,
   flagged for security review.

## Deploying (WS-C, 2026-09)

`.github/workflows/deploy-pages.yml` runs on every push to `main`: typecheck → lint → test →
`npm run build` → assembles one artifact (landing page at `/`, built SPA at `/app/`, an
`index.html` copy per top-level route so deep links return 200, `/404.html` as the SPA fallback
for dynamic routes) → `actions/deploy-pages` → smoke test (`/`, `/app/`, `/app/login/` must be
200 with the built bundle, never `/src/main.tsx`).

**Owner prerequisite (one-time):** switch Pages from the legacy branch publish to Actions:
`gh api -X PUT repos/conf007/confiddo.in/pages -f build_type=workflow` (or Settings → Pages →
Source → *GitHub Actions*). Until then `main` still publishes the raw source and `/app/` is blank.

Environment-specific builds: set the repository (or environment) variable `VITE_API_BASE_URL`
to point a build at staging (`https://conf007-staging--confiddo-backend-fastapi-app.modal.run/v1`);
unset = production. `VITE_ENABLE_CLASS_RANKINGS` likewise. Locally: `app/.env.local`.

Caching: GitHub Pages serves everything with `cache-control: max-age=600` and an ETag; Vite's
hashed `assets/*` names make each release cache-safe, and `index.html` revalidates every 10 min.

Bundle: route-level lazy chunks (`src/app/router.tsx`, 75 chunks); initial `index-*.js`
≈ 105 kB gzip (was 168 kB in one 627 kB chunk).

`.github/workflows/ci.yml` (typecheck/lint/test/build + gitleaks) runs on PRs and pushes to `main`/`dev`.
