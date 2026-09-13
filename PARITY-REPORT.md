# Web parity report — 2026-09-13

Branch `feat/web-parity-2026-09` (this repo) + `feat/web-parity-2026-09` (`conf007/confiddo`).

## Part 0 — findings

### The website the owner saw is the un-built source, not the app

`curl -sL https://confiddo.in/app/` (2026-09-13) returns a page whose only script tag is
`<script type="module" src="/src/main.tsx">`. That is the raw Vite entry, which a browser cannot
run: the page is blank. GitHub Pages is still publishing the repository files; the
`deploy-pages.yml` workflow that builds the bundle only takes effect once the Pages source is
switched to GitHub Actions (owner action, `DEPLOY_RUNBOOK.md`). Nothing on `dev` was reachable
from that URL, so "characters do not appear" and "app data missing" are, first, a stale deploy.

The `dev` branch served locally (`npm run dev`, screenshot in the owner's message) already
renders the 18-character gallery, XP, badges and class pages against production data.

### Characters, specifically

- Backend: `GET /v1/student/gamification` (XP) and `PUT /v1/student/character?character_id=`
  with the server-side gate `CHARACTER_REQUIRED_XP` (`backend/app/api/student.py:26-37`, 403
  `CHARACTER_LOCKED` at `:172-184`). 18 ids, not 16: the audit's "16" was wrong; code wins.
- Web: `src/pages/student/CharactersPage.tsx` fetches both and renders all 18. Before this
  sprint the 403 fell through `friendlyError` as raw text and the header/home never showed the
  equipped character.

### Parity gap table (student), status after this sprint

| Feature (Flutter screen) | Before | After |
|---|---|---|
| Characters gallery, 18, locked/unlocked, XP shown | present | present |
| Equip flow + `CHARACTER_LOCKED` 403 | present, 403 unhandled | handled: server message shown, XP re-read |
| Equipped character on header / home | missing | present (`UserMenu`, `HomePage`) |
| XP total, level, progress-to-next | present, client constants | server `next_level_points` / `current_level_points` |
| Streak + today status | streak only | today status (`last_active_date`) on home and progress |
| Point-transaction history | absent | absent — the app has no such screen and the backend no endpoint |
| Past tests list / history | home only | `/student/history` from `GET /student/academic-sessions` (the app's home call) |
| Session review page | present | present |
| Revision / re-attempt, `is_practice_only` copy | present | present |
| Notifications list | present | present |
| Profile: name, class, linked-parent status | parent status missing | present (`parent_has_logged_in`) |
| Badges | present (client-derived, as in the app) | present |
| Class page | present (rankings flag-gated) | present |

### Other roles (reported, not built)

Teacher: no `/teacher/profile`, no historical review screens, no paper config/prompt screens,
no per-student level PATCH. Parent: no subject detail, no performance card. Principal: no
teacher-insights screen. Unchanged; see `audit/dossier/01-screen-inventory.md` §2 on
`audit/system-design-2026-09`.

## Part 1 — what changed

- `src/lib/api/errors.ts`: `CHARACTER_LOCKED`, `SESSION_LOCKED_OTHER_SURFACE`, `SESSION_NOT_IN_PROGRESS`.
- `src/pages/student/CharactersPage.tsx`: 403 → server message + gamification refetch.
- `src/components/UserMenu.tsx`, `src/pages/student/HomePage.tsx`: equipped character.
- `src/components/student/gamification.ts`: `levelProgressFrom`, `streakTodayStatus`; used by
  `ProgressPage`, `ClassProgressPage`, `HomePage`.
- `src/pages/student/ProfilePage.tsx`: parent status, history link.
- `src/pages/student/HistoryPage.tsx`, route `/student/history`.

## Part 2 — exclusive test session (client side)

- `src/lib/auth/tokens.ts` `surfaceId()`; `src/lib/api/client.ts` sends `X-Surface-Id` and
  `X-Surface-Kind: web` on every authenticated request.
- `src/lib/api/sessions.ts`: `SessionLease`, `sessionLockOf` (423 parser), `takeOverSession`, `renewLease`.
- `src/pages/student/session/useSessionLease.ts`: lock state, takeover, 30 s heartbeat.
- `src/components/student/SessionLockGate.tsx`: interstitial ("This test is open on your app.")
  and the final locked screen ("This test was continued on another device.").
- Wired into `TestStartPage` (resume refused → takeover → resume), `QuestionPage` (bundle and
  every mutation), `ReviewPage` (finish; also handles 409 `VERSION_CONFLICT`, which it did not before).
- Teacher: `DeviceSwitchBadge` on attempt-status rows and review-queue cards at ≥ 2 switches.

## Tests

- vitest: 217 (was 192). New: `surface-lease.test.ts`, `SessionLease.test.tsx`,
  `CharactersPage.test.tsx`, `gamification.test.ts`, `ProfileAndHistory.test.tsx` (includes the
  page-source golden-rule scan for the new pages), `UserMenu.test.tsx`.
- Playwright (`app/e2e/specs`): `student-core-loop` (characters, equip, history, full test,
  banned-pattern scan on done/results), `device-switch` (interstitial → takeover → old surface
  locked, exactly one submit from the displaced page), `both-open` (non-holder gets 423 on
  bundle, question and submit while the holder keeps working). Runner: `app/e2e/run.sh`.

## Follow-ups

- Owner: switch the Pages source to GitHub Actions; the backend must deploy first (`dev` web needs
  the bundle/version/lease endpoints).
- Flutter (fielded APK): send `X-Surface-Id`/`X-Surface-Kind`, handle 423 (interstitial + take-over),
  `expected_version`, bundle endpoint, `time_spent_ms`, refresh rotation.
- Class rankings remain behind `VITE_ENABLE_CLASS_RANKINGS` (product decision).
- Point-transaction history: needs a backend endpoint and an app screen first.
