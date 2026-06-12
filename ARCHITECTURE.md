# Confiddo Web App — Parity Contract (ARCHITECTURE.md)

> **Status:** Authoritative parity contract for porting the Confiddo Android app (Flutter) to a native web app.
> **Source of truth:** the code in `confiddo/` (backend FastAPI + PostgreSQL, frontend Flutter, admin_panel Flutter Web).
> Every number in this document was verified against the code on 2026-06-11. File references are repo-relative
> with line numbers, e.g. `backend/app/services/metrics_service.py:734`.

---

## 1. System Overview

| Component | Tech | Role |
|---|---|---|
| Backend | FastAPI + SQLAlchemy, PostgreSQL (Neon) / SQLite (dev), Redis (rate limiting), deployed on Modal | **Authoritative** for everything: metrics, readiness levels, XP, streaks, anti-farming, privacy filtering |
| Android app | Flutter (`frontend/`) | Display + flow orchestration only. Never computes metrics/readiness/XP totals |
| Admin panel | Flutter Web (`admin_panel/`) | Admin-only: schools, question banks, imports, reported questions |
| **Web app (to build)** | Vite + React + TS + Tailwind SPA | Same role as Flutter app: display + flow orchestration against the same backend |

**Division of computation (non-negotiable):**
- The backend computes all 15 behavioral metrics, readiness levels L1–L5, weighted accuracy, XP awards,
  streaks, quality multipliers, anti-farming checks, and weekly aggregation
  (`backend/app/services/metrics_service.py`, `gamification_service.py`, `teacher_service.py`).
- The client (Flutter today, web tomorrow) only: drives the test attempt flow (8 API calls, §5), reports
  client-observable facts (`time_spent_ms`, `app_switches`, `skipped_count`, `did_review`), and renders
  what the backend returns. Client-side XP/level constants exist only for explainer screens
  (`frontend/lib/core/constants/xp_rules.dart`) and character unlock gating
  (`frontend/lib/core/utils/character_utils.dart`).
- Raw accuracy/scores are computed internally and **never shown to students or parents** — students see
  readiness *words*, parents see narratives (`metrics_service.py:10-11`, `backend/app/models/parent.py`).

---

## 2. Backend & Data Layer

### 2.1 Base URL & API prefix
- Production base URL (hardcoded in all 5 Flutter API services, e.g. `frontend/lib/data/datasources/api_service.dart:24`):
  ```
  https://conf007--confiddo-backend-fastapi-app.modal.run/v1
  ```
- API prefix `/v1` from `backend/app/config.py:9` (`api_v1_prefix`). Health: `GET /health`; docs: `/docs`.
- The web app must read this from an env var (`VITE_API_BASE_URL`), not hardcode it.

### 2.2 Auth (JWT)
- **Algorithm** HS256; **access token 24 h**, **refresh token 7 d** (`backend/app/config.py:18-21`).
  Payload: `sub` (user_id), `username`, `full_name`, `role`, `exp`, `iat`, `jti`, `type` (access/refresh).
- Header: `Authorization: Bearer <access_token>`. Refresh: `POST /v1/auth/refresh` with `refresh_token` in body.
- **Per-role login endpoints** (`backend/app/api/auth.py`): `POST /auth/student/login`, `/auth/teacher/login`,
  `/auth/parent/login`, `/auth/principal/login`, `/auth/admin/login`. Self-registration:
  `POST /auth/teacher/register` (6-char invite code, 7-day expiry) and `POST /auth/parent/register` (open).
- **Rate limiting:** Redis-backed, **20 attempts / 15 min** per username (`backend/app/config.py:24-25`),
  bucketed `username` / `teacher:u` / `parent:u` / `principal:u` / `admin:u` (`auth.py:55,115,155`). 429 with retry-after on limit.
- **First-login flows:** all roles have `is_first_login`; mandatory password change via
  `POST /auth/password-reset/first-login/reset` plus email verification OTP endpoints
  (`first-login/email-info`, `first-login/send-email-otp`, `first-login/verify-email`).
- **Password reset:** `POST /auth/password-reset/forgot-password` → `/verify` (OTP) → `/reset`. OTP: 10 min expiry,
  5 attempts max, 3 resends/session, 30 s cooldown, 5 forgot-password req/hour (env-configurable).
- **Parent device limit:** `MAX_PARENT_DEVICES = 2` (`backend/app/models/parent.py:9`), enforced at parent login
  via `ParentSession` (device_id + heartbeat, stale > 24 h cleaned). Web client must supply a stable `device_id`
  (e.g. UUID persisted in localStorage).
- **Parent gate on tests:** a student with a linked parent **cannot start a session** until that parent has
  logged in at least once (`backend/app/api/sessions.py:40-59`, error code `PARENT_NOT_LOGGED_IN`).
- `POST /auth/verify-parent`: parent password check used by the student app's "app lock" resume flow.

### 2.3 Key tables/models (one line each)
| Model (table) | File | Key fields |
|---|---|---|
| Student | `backend/app/models/student.py` | username, password_hash, class_grade, section, roll_number, school_id, `selected_character` (default `"noob"`, line 25), email, is_active, is_first_login |
| Teacher / Parent / Principal / Admin | models/teacher.py, parent.py, principal.py, admin.py | per-role accounts; Principal has role ∈ {principal, vice_principal, coordinator} |
| School / Class / TeacherClass / ClassStudent | models/school.py, teacher.py | org hierarchy; TeacherClass carries assignment workflow (pending/accepted/rejected, acceptance_deadline) |
| Test (`tests`) | `backend/app/models/test.py:29-87` | status draft→live→review→completed, `published_at`, `deadline`, `review_start_date`, `review_state` JSON, `class_id`, total_questions (default 10) |
| Question (`questions`) | `backend/app/models/question.py:8-40` | question_number, question_text, type `mcq`, difficulty ∈ {easy, medium, hard} (lowercase in DB; CSV uses Simple/Medium/Hard), topic, subtopic, hint_text, solution_text, `population_median_ms` |
| QuestionOption | question.py:42-63 | option_label A–D, option_text, is_correct, display_order |
| PracticeSession (`practice_sessions`) | `backend/app/models/session.py:8-36` | status in_progress/completed/abandoned, session_type practice/revision, current_question_number, is_late_submission |
| QuestionAttempt (`question_attempts`) | session.py:39-61 | selected_option_id, hints_used, solution_viewed, **solution_viewed_after_correct**, persisted_after_wrong, gave_up_after_wrong, time_spent_ms, option_changes |
| StudentMetric (`student_metrics`) | `backend/app/models/metrics.py:8-39` | metric_type **m01–m15** (obfuscated), metric_value Numeric(5,4), metric_category green/yellow/red/neutral |
| DifficultyFlag | metrics.py:42-63 | tagged_difficulty vs actual_pass_rate, suggested_difficulty, severity |
| ReadinessSuggestion / TeacherValidation / TeacherReviewSession | models/teacher.py | per-test suggested_level + teacher action agree/same/adjust → final_level |
| StudentPoints (`student_points`) | `backend/app/models/gamification.py:8-51` | total_points, current_streak, longest_streak, last_active_date, level 0–4, perfect_test_count, weeks_with_activity |
| PointTransaction | gamification.py:54-72 | points + reason ledger (question_attempted, test_completed, first_today, comeback, streak_multiplier, quality_multiplier, skipped_questions, skipped_not_reviewed, incorrect_not_reviewed, app_switch_penalty, review_incorrect, abandoned_session, …) |
| SubjectStreak | gamification.py:75-128 | per-subject weekly completion streak (ISO week strings) |
| ParentStudent / StudentLinkingCode / ParentSession / ParentSummary / GrowthCard / HomeGoal | models/parent.py | linking (6-char code, 24 h, single-use), 2-device limit, weekly narrative summaries with `internal_readiness_level` **never exposed** |
| Notification / FCMToken / per-role NotificationPreference | models/notification.py | in-app history + push tokens (`device_type` supports `web`), quiet hours |
| ClassReadinessAggregate / TeacherInviteCode / TeacherApprovalQueue / PrincipalActionsLog | models/principal.py | aggregate counts only (no student names), governance |
| Board / Subject / Chapter, QuestionBank, EmailOTP, BehavioralEvent | misc | syllabus, banks, OTP, raw event stream (`POST /v1/events/batch`) |

### 2.4 CORS — current status and what web needs
`backend/app/main.py:102-108`:
```python
allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"]
```
- Today: wide open, credentials disabled. Bearer tokens in headers (not cookies) **do work** with this config,
  so the web app functions immediately.
- **Required before production:** restrict `allow_origins` to the web app's domain(s) + localhost dev port.
  Keep `allow_credentials=False` as long as auth stays header-based (recommended; avoids CSRF surface).

---

## 3. Behavioral Metrics Engine (verified line-by-line)

All pure functions in `backend/app/services/metrics_service.py`. Obfuscation map m01–m15 at lines 41-46.
Inputs: `AttemptData` (lines 59-71: selected_option_id, is_correct, time_spent_ms, hints_used, option_changes,
persisted_after_wrong, gave_up_after_wrong, difficulty, created_at, population_median_ms) and `SessionData`
(lines 74-80). `accuracy` = correct / attempted (selected_option_id not null), computed once in
`calculate_all_metrics_pure` (lines 806-808). Note: AIR is called with `questions_shown = len(attempts)` (line 811).

### 3.1 The 15 metrics

| id | Acr. | Name | Formula (exact) | Green | Yellow | Red | Edge cases |
|---|---|---|---|---|---|---|---|
| m01 | AIR | Attempt Initiation Rate (`:87-106`) | attempted/shown, where attempted = `selected_option_id != None OR gave_up_after_wrong` | ≥ 0.85 | ≥ 0.60 | < 0.60 | gave-up counts as *initiated* (AIR=initiation, DPI=persistence) |
| m02 | TFA | Time-to-First-Action (`:109-141`) | avg `time_spent_ms` over answered Qs | <3000 ms & acc ≥0.70 ("quick_knowledgeable"); 3000–15000 ms any acc ("deliberate"); 15001–60000 ms & acc ≥0.70 ("careful_accurate") | <3000 ms & 0.40≤acc<0.70 ("fast_mixed"); 15001–60000 ms & acc<0.70 ("delayed") | <3000 ms & acc<0.40 ("rushing"); >60000 ms ("timeout"); no answered Qs ("no_data") | Speed penalized only with low accuracy |
| m03 | OCB | Option Change Behavior (`:144-174`) | avg `option_changes` over answered Qs | ≤0.5 & acc≥0.70 ("decisive_correct"); 0.5<x≤2.5 & acc≥0.50 ("reflective") | ≤0.5 & 0.40≤acc<0.70 ("stable_mixed"); 0.5<x≤2.5 & acc<0.50 ("uncertain") | ≤0.5 & acc<0.40 ("clicking_through"); >2.5 ("insecure"); no data | Replaces legacy OEP+ORB |
| m04 | HUP | Hint Utilization (`:177-209`) | hint_rate = (#answered Qs with hints>0)/answered | rate ≤0.60 (unless rate=0 & acc<0.40) | 0.60<rate≤0.80 ("dependent"); rate>0.80 & hinted-accuracy ≥0.30 ("dependent_but_learning"); rate=0 & acc<0.40 ("should_seek_help") | rate>0.80 & hinted-accuracy <0.30 ("dependent_not_learning") | Red requires heavy hints AND hints not helping; no attempts → green "no_data" |
| m05 | PHE | Post-Hint Engagement (`:212-236`) | continued = hinted Qs with an answer / hinted Qs | no hints & acc≥0.40 (score 1.0, "independent"); score ≥0.80 | no hints & acc<0.40 (score 0.5, "should_seek_help"); 0.50≤score<0.80 | score <0.50 | |
| m06 | SCC | Session Completion Consistency (`:239-272`) | `score = completed(0/1) × (1 − rushing_penalty)`; rushing: total_time < 30%·(N×30 s) & acc<0.50 → 0.5; <50% & acc<0.50 → 0.25; focus_penalty hardcoded 0 | score ≥0.85 | score ≥0.60 | else | No rushing penalty if acc ≥0.50 |
| m07 | DPI | Difficulty Persistence Index (`:275-316`) | wrong = attempts with persisted∨gave_up flags. engagement = (persisted×1.0 + gave_up×0.3)/wrong; score = 0.40×completion_rate + 0.60×engagement | score ≥0.70 AND engagement ≥0.60 | score ≥0.45 OR engagement ≥0.40 | else | **≤2 wrong → status "neutral"** ("insufficient_wrong_data"). The `if not wrong_attempts:` branch (`:290-298`) is unreachable dead code (the ≤2 check returns first) |
| m08 | RGD | Rapid Guessing Detection (`:319-384`) | threshold = max(0.15×population_median_ms, 1000 ms) if median present, else static {easy 2000, medium 3000, hard 5000, default 3000}. effective_rate = min(fast_wrong/total_fast, fast_wrong/total_attempted) | <0.25; or 0 fast answers ("no_fast_answers"); or <3 fast answers ("insufficient_fast_data"); or overall acc ≥0.70 & rate ≤0.30 ("fast_knowledgeable") | 0.25–0.35 | >0.35; or 0 attempted | Fast+correct never flagged |
| m09 | FAD | Fatigue/Attention Decay (`:387-458`) | split halves at `len//2`; drop = early acc − late acc, **easy-only** if both halves have easy Qs, else all-Q with +0.05 widened thresholds. Difficulty-aware: if late-half avg difficulty > early+0.5 → thresholds 0.20/0.40, else 0.10/0.25 | drop < green_thr (easy path) / < green_thr+0.05 (all-Q path) | up to yellow_thr (+0.05 all-Q); improvement >0.30 → yellow "suspicious_improvement" | beyond; red categorized by speed_ratio = late_time/early_time: <0.7 "disengagement", >1.3 "cognitive_fatigue", else "decline" | **<6 attempts → "neutral"** |
| m10 | TCR | Test Completion Rhythm (`:461-501`) | max coefficient-of-variation (σ/μ of time_spent_ms) per difficulty group; dump = avg(last 3 times) < 0.30×avg(first 3) when ≥6 answers | CV <0.50 & no dump | 0.50≤CV≤0.80 & no dump; or <3 attempts (score 0) | CV >0.80 OR dump | |
| m11 | HSB | Help-Seeking Behavior (`:504-557`) | strategic = hints on med/hard & wrong; unnecessary = hints on easy; missed = med/hard wrong, no hint, no persist/gave-up or skipped. score = strategic/(s+u+m) | ≥0.60 ("strategic"); denom=0 & acc≥0.80 ("no_help_needed") | 0.30–0.59 ("mixed"); denom=0 & acc<0.80 ("uncertain"/"should_have_sought_help") | <0.30 ("unfocused") | gave_up = legit help-seeking (not "missed") |
| m12 | PEB | Post-Error Behavior (`:560-604`) | for each wrong answered Q, inspect next Q: skip → not resilient; time <0.3×avg → not resilient; time >2.5×avg → resilient only if next is med/hard; else resilient. rate = resilient/post_error | ≥0.70; or 0 errors (1.0) | 0.40–0.69; or <2 attempts (1.0 yellow) | <0.40; or no answered Qs | attempts sorted by created_at |
| m13 | EWP | Effort-Withdrawal (`:607-647`) | thirds (size max(2, n//3)); effort = avg(time_ms + 2000×option_changes + 3000×hints_used); ratio = late/early | ratio >0.70; or ratio ≤0.70 but late_acc ≥0.85×early_acc ("efficient") | 0.40≤ratio≤0.70 ("declining"); or n<6 (1.0 yellow) | ratio <0.40 ("withdrawal"); early_effort=0 | Efficiency exemption |
| m14 | GEP | Guttman Error Pattern (`:689-727`) | all cross-difficulty answered pairs; error = harder correct & easier wrong; consistency = 1 − errors/pairs | >0.85 ("consistent") | 0.65–0.85 ("mixed") | <0.65 ("inconsistent") | <4 answered or 0 pairs → **"neutral"** |
| m15 | DAP | Difficulty-Adjusted Performance (`:650-686`) | ratio = avg_time(med+hard)/avg_time(easy); hard_acc on med+hard | 1.0≤ratio<1.3 & hard_acc ≥0.70 ("high_ability"); 1.3≤ratio≤3.0 ("appropriate") | ratio<1.0 & hard_acc≥0.70 ("unusual_but_accurate"); 1.0≤ratio<1.3 & hard_acc<0.70 ("flat_struggling"); 3.0<ratio≤5.0 ("excessive"); missing easy or hard ("insufficient_data") | ratio<1.0 & hard_acc<0.70 ("confused"); ratio>5.0 ("freezing_on_hard") | "hard" bucket here = medium+hard |

### 3.2 Difficulty-weighted accuracy (`:730-757`)
```python
DIFFICULTY_WEIGHTS = {"easy": 1.0, "medium": 2.0, "hard": 3.5, "very_hard": 5.0}   # :734
w_acc = Σ weight(correct answered) / Σ weight(all answered)   # rounded to 4 dp, default weight 2.0
```

### 3.3 Student theta (internal only, `:765-791`)
Static `_DIFF_TO_THETA = {easy: −1.0, medium: 0.0, hard: 1.5, very_hard: 2.5}`, logistic update
`theta += 0.4 × (outcome − 1/(1+e^−(theta−diff)))` over answered Qs in order; clamp [−3.0, 3.0], round 3 dp.
Not used for level gating; returned in result payload only.

### 3.4 Readiness classification L1–L5 (`calculate_readiness_level_pure`, `:829-937`)
Top-down first-match. `n = 15`. **neutral counts as green** (`:850`). Display names (`:857-863`):
1 Avoidant, 2 Attempting, 3 Practicing, 4 Confident, 5 Competition Ready. Frontend display strings
(`frontend/lib/data/models/suggestion_model.dart:4-22`): avoidant → **"Needs Encouragement"**, others as-is.

Difficulty exposure inputs (`:881-891`):
- `has_strict_difficulty_exposure` = (answered hard/very_hard) / answered ≥ **0.15**
- `test_lacks_hard` = (hard/very_hard in test) / all Qs < **0.20**

```
L5 competition_ready (:895-898):
    green ≥ 14 (n−1)  AND  red == 0  AND  w_acc ≥ 0.80
    AND rgd.status == "green"  AND  has_strict_difficulty_exposure        # no bypass, ever

L4 confident (:902-914):
    air green  AND  dpi != red  AND  scc green  AND  rgd != red  AND  fad != red
    AND green ≥ 9  AND  red ≤ 2  AND  w_acc ≥ 0.55
    AND ( has_strict_difficulty_exposure  OR  (test_lacks_hard AND w_acc ≥ 0.75) )

L3 practicing (:917-924):
    air green  AND  dpi != red  AND  rgd != red
    AND (15 − red) ≥ 5   # i.e. red ≤ 10
    AND w_acc ≥ 0.35

L2 attempting (:928-934):
    air != red  AND  scc != red  AND  rgd.score < 0.40  AND  red ≤ 8

L1 avoidant (:937): default fallback (no criteria of its own)
```
Returned payload: level, code, display_name, metrics, accuracy (internal), weighted_accuracy, theta,
green/yellow/red counts (`:867-879`).

### 3.5 Per-test suggestions & weekly aggregation (`backend/app/services/teacher_service.py`)
- `ensure_suggestions_exist_for_test()` (`:952+`): per student per test, runs MetricsService scoped to that
  test's sessions, writes a `ReadinessSuggestion` (test_id NOT NULL, week = test's actual week).
- `get_weekly_student_level()` (`:924-950`): collects that week's per-test suggestions; per suggestion uses
  `TeacherValidation.final_level` if a validation exists, else `suggested_level`; maps
  {avoidant 1 … competition_ready 5}; **weekly level = round(mean)** (Python banker's rounding);
  no data → default **"practicing"**.
- XP coupling: the quality multiplier (§4) calls `MetricsService.calculate_readiness_level(student, test)` live
  at award time (`gamification_service.py:254-262`), defaulting to level 3 on failure.

### 3.6 Difficulty-tag validation (`backend/app/services/validation_service.py:55-99`)
Auto-runs in background after every 10th distinct completing session (`sessions.py:556-583`). Flags:
- easy & pass_rate < 0.40 → suggest medium (or hard if < 0.20), severity high
- hard & pass_rate > 0.85 → suggest easy, severity high
- medium & pass_rate > 0.90 → suggest easy, severity medium
- medium & pass_rate < 0.25 → suggest hard, severity medium
Persisted as `DifficultyFlag` rows.

---

## 4. XP Economy (verified against `backend/app/services/gamification_service.py`)

### 4.1 Constants (`:28-54`)
```python
LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000]                                   # :28
LEVEL_NAMES = ["Explorer", "Rising Star", "Super Nova", "Blazing Pro", "Galaxy Master"]  # :29
XP_CORRECT_NO_HINT = 4;  XP_CORRECT_WITH_HINT = 3;  XP_WRONG_PERSISTED = 2   # :33-35
XP_WRONG_GAVE_UP = 0;    XP_WRONG_NO_REVIEW = -1;   XP_SKIP_PENALTY = -2     # :36-38
XP_TEST_COMPLETED = 10;  XP_FIRST_TODAY = 5;        XP_COMEBACK = 10         # :39-41
XP_REVIEW = 3                                                                 # :42
QUALITY_MULTIPLIERS = {1: 0.5, 2: 0.75, 3: 1.0, 4: 1.25, 5: 1.5}             # :45
XP_PENALTY_SKIPPED = -1; XP_PENALTY_INCORRECT = -1; XP_PENALTY_APP_SWITCH = -3  # :48-50
```
Curiosity bonus: **+1** per correct question whose solution was viewed *after* the correct answer (`:189-191`).
Level = highest index i with total_points ≥ LEVEL_THRESHOLDS[i] (`:71-76`).

### 4.2 `award_session_points` pipeline, exact order (`:92-348`)
0. **Anti-farming gate** (`:119-144`): if any PointTransaction with reason ∈ {test_completed, question_attempted}
   exists for the *same test* in *another session* since Monday of the current week → return
   `{total_earned: 0, is_practice_only: true}` and skip everything below.
1. **Per-question XP** (`:170-196`): correct+no hint +4; correct+hint +3; wrong+persisted +2; wrong+gave-up 0;
   wrong otherwise −1; +1 curiosity per correct-then-solution-viewed. Single transaction reason `question_attempted`.
2. **Skip penalty** (`:199-203`): `(total_questions − attempted) × −2`, reason `skipped_questions`.
3. **Completion bonus** (`:206-209`): attempted ≥ total_questions (>0) → +10, reason `test_completed`.
4. **First test today** (`:214-224`): +5 if no *other* completed non-revision session today, reason `first_today`.
5. **Comeback** (`:227-230`): +10 if `today − last_active_date ≥ 3` days, reason `comeback`.
6. **Streak multiplier** (`:232-247`): projected streak (yesterday-active → streak+1; today → same; else 1);
   if ≥ 7 → bonus = `base_points // 2` (integer floor; 1.5× total), reason `streak_multiplier`.
7. **Quality multiplier** (`:251-270`): live readiness level (default 3 on error);
   `total = int(total × mult)`; delta logged as reason `quality_multiplier`.
8. **Review/focus penalties — applied AFTER the multiplier, unscaled** (`:272-296`):
   skipped_without_review × −1 (`skipped_not_reviewed`); incorrect_without_review × −1
   (`incorrect_not_reviewed`); app switches (client counts only absences > 30 s): **first −2, each additional −3**
   (`:291`: `−2 + (n−1)×−3`), reason `app_switch_penalty`.

Then (same call): streak/state update (`:298-321`) — streak +1 if last active yesterday, reset to 1 if gap ≥ 2 days,
unchanged if already active today; longest_streak, total_practice_days (once/day), weeks_with_activity
(once/ISO week), total_tests_completed +1, perfect_test_count +1 if all `total_questions` selected options are
correct. Finally `total_points = max(0, total_points + total_earned)` (`:335`) and level recalc.
**Note: `total_earned` for one session CAN be negative; only the cumulative total is floored at 0.**

### 4.3 Other award paths
- **Review points** (`award_review_points`, `:350-382`): revision sessions earn +3 per question, max once per
  question per week (reason `review_incorrect`). Triggered automatically by `POST .../complete` when
  `session_type == "revision"` (`sessions.py:517-522`).
- **Consistency deductions** (`deduct_consistency_points`, `:384-420`): default −5; used with points=3 reason
  `abandoned_session` when a student REATTEMPTs a test that had an in-progress session (`sessions.py:86-110`),
  and for late teacher acceptance (Edge Case #20).

### 4.4 Levels & character collection
- XP levels: see constants above. Frontend explainer (`frontend/lib/core/constants/xp_rules.dart:64-71`)
  matches: Explorer 0–49, Rising Star 50–199, Super Nova 200–499, Blazing Pro 500–999, Galaxy Master 1000+.
- **16 characters / 4 rarities** (`frontend/lib/core/utils/character_utils.dart:52-244`), unlock when
  `total_points ≥ requiredXp`:
  - Starter (0 XP): ace, kira, raze, luna, dash, zep
  - Rare: onyx 1000, echo 1500, fang 2000, circuit 2500
  - Epic: spectre 3500, viper 4000, aurora 4500, havoc 5500
  - Legendary: pharaoh 6500, zenith_prime 7500, drakon 8500, apex 10000
- Persisted server-side via `PUT /v1/student/character` (`backend/app/api/student.py:146-173`) which validates
  the ID against the 16-name list but **does NOT verify XP** — unlock gating is client-side only. The web app
  must replicate the client-side XP gate (and this is flagged as a server-side hardening gap, §9).
- Default character `"noob"` is the DB default but is not in the selectable list.

---

## 5. Test Attempt Lifecycle

### 5.1 The 8 API calls in order (`backend/app/api/sessions.py`)
1. `POST /v1/student/sessions` — body `{test_id, mode}` (`:33-131`). Modes (`schemas/session.py`):
   - `continue` → resume existing in-progress session or create one. Blocked with `TEST_ALREADY_COMPLETED`
     if a completed session exists (revision/reattempt are then the only options).
   - `reattempt` → archives in-progress sessions, creates fresh practice session; if an in-progress session
     existed, **−3 XP** `abandoned_session` deduction (`:86-110`).
   - `revision` → archives in-progress, creates `session_type="revision"` session.
   Gate: `PARENT_NOT_LOGGED_IN` 403 if linked parent never logged in (`:40-59`).
   Response: `{session_id, test_id, status, current_question_number, total_questions, is_revision, is_late[, late_message]}`.
2. `GET /v1/student/sessions/{sid}/questions/{number}` (`:172-227`) — returns
   `{question: {id, question_number, question_text, options[]}, progress: {current, total}}`;
   **creates the QuestionAttempt row on view** (so unanswered-but-seen questions exist for metrics).
3. `GET /v1/student/sessions/{sid}/questions/{qid}/hint` (`:230-265`) — `{hint}`; increments `hints_used`
   (`session_service.py:142-148`).
4. `POST /v1/student/sessions/{sid}/questions/{qid}/submit` — `{selected_option_id}` (`:316-377`,
   `session_service.py:92-140`). Returns `{recorded, is_correct, correct_option_id, correct_option_label,
   has_next, next_question_number}`. Resubmission with a different option increments `option_changes`; a retry
   also auto-corrects a prior spoof-flagged `gave_up_after_wrong` → `persisted_after_wrong`
   (`session_service.py:115-118`). **Server time bounds** on `time_spent_ms`: < 200 ms floored to 200;
   > 600000 ms capped (`session_service.py:121-136`).
5. `POST /v1/student/sessions/{sid}/questions/{qid}/persistence?persisted=bool` (`:379-429`) — the
   "Try Again" (persisted=true) vs "See Solution" (false) choice after the first wrong answer.
   **Anti-spoofing:** `persisted=true` requires ≥ 2 submissions for that question, else server records
   `gave_up_after_wrong=true` (`:398-419`).
6. `GET /v1/student/sessions/{sid}/questions/{qid}/solution?after_correct=bool` (`:268-313`) —
   `{solution, correct_option_id, correct_option_label}`; sets `solution_viewed` and, when `after_correct=true`,
   `solution_viewed_after_correct` (feeds the +1 curiosity XP).
7. `POST /v1/student/sessions/{sid}/complete` — body `{skipped_count, incorrect_count, did_review, app_switches}`
   (`:468-631`). If `did_review=true`, skip/incorrect penalties are zeroed (`:507-510`). Marks late if past
   deadline. Awards XP synchronously (response field `gamification` = `{total_earned, breakdown[], total_points,
   current_streak, level, level_name[, is_practice_only][, review_points_earned]}`), then spawns a **background
   thread** (`:534-630`) that: (a) computes & persists metrics, (b) runs difficulty-tag validation at every 10th
   distinct completing session, (c) **all-students-finished check**: if distinct completed students ≥ active
   ClassStudents for the class → fire `on_all_students_completed_test` teacher notification and flip
   `Test.status` LIVE → REVIEW (`:584-624`).
8. `GET /v1/student/tests/{test_id}/results` (`:134-169`) — `{session_id, test_id, total_questions,
   correct_count, incorrect_count, score_percentage, attempts[…], incorrect_question_numbers[]}` —
   computed server-side at read time. (Shown to the *student* in the review flow; never to parents.)

Plus: `POST /v1/student/questions/{qid}/report?report_type&description` for bad questions, and
`POST /v1/events/batch` (student-only) for the behavioral event stream.

### 5.2 Test generation & lifecycle
- Distribution (`backend/app/services/question_bank_service.py:812-826`, `_get_distribution`):
  - Easy → 100% Simple
  - Mixed → Medium = int(0.4×N), Simple = remainder (10 Q → 6S + 4M)
  - Hard → Hard = int(0.2×N), Medium = int(0.3×N), Simple = remainder (10 Q → 5S + 3M + 2H)
  - Bank pool per chapter: 60 Simple / 30 Medium / 20 Hard = 110. Replacements draw from the same difficulty pool.
- Publishing (`backend/app/api/teacher.py:900-936` → `teacher_service.py:3632-3711` →
  `models/test.py:61-68`): DRAFT only; prunes non-slot questions, renumbers, sets is_active, status=LIVE,
  published_at=now, **deadline = Sunday of the NEXT week at 23:59:59** (`models/test.py:16-26`:
  jump to next week, then that week's Sunday — *not* simply "the coming Sunday"), review_start_date = deadline + 1 day.
  Deletes other stale drafts for the class. Notifies all class students.
- Status lifecycle: `draft → live (teacher publish) → review (auto when all students complete, or post-deadline)
  → completed (teacher finishes review)`.
- Late submission allowed but flagged (`is_late_submission`, `sessions.py:491-496`).

---

## 6. Roles & Capabilities

### 6.1 Capability matrix
| Capability | Student | Parent | Teacher | Principal | Admin |
|---|---|---|---|---|---|
| Take tests / sessions | ✓ | — | — | — | — |
| View own XP/level/streak/characters/badges | ✓ | (effort narrative only) | — | — | — |
| Generate parent-link code (6-digit, 24 h) | ✓ | use code | — | — | — |
| View child summaries (narrative, no scores) | — | ✓ | — | — | — |
| Home goals / conversation starters / growth cards / exam guide | — | ✓ | — | — | — |
| Device management (2-device cap) | — | ✓ | — | — | — |
| Create/publish tests (AI paper flow + question banks) | — | — | ✓ | — | ✓ (admin tests) |
| Validate readiness suggestions (agree/same/adjust), bulk validate | — | — | ✓ | — | — |
| Flags, notes, interventions, parent messages, reminders | — | — | ✓ | — | — |
| Class analytics (aggregates), class comparison | — | — | ✓ | ✓ | ✓ |
| School heatmap, teacher directory/approval/invite codes, student search | — | — | — | ✓ | — |
| Schools/question banks/imports/reported questions/platform analytics | — | — | — | — | ✓ |

Full endpoint surface (≈240 endpoints, 11 routers) is enumerated in `backend/app/api/*` — see §2 of the
backend report; per-role dependency guards `get_current_student|teacher|parent|principal|admin` check role,
existence, and `is_active`.

### 6.2 Screen inventory → planned web routes
(Flutter source: `frontend/lib/presentation/screens/…`; the web app mirrors 1:1 unless noted.)

**Shared/auth:** `/login` (role picker + credentials), `/register/teacher`, `/register/parent`,
`/first-login` (password reset + email OTP), `/forgot-password`, `/forgot-username`, `/about`, `/notifications`.

**Student** (bottom-nav → top-nav/tab routes):
| Flutter screen | Web route |
|---|---|
| home/home_screen (tests by subject, resume) | `/student` |
| session/invitation_screen | `/student/tests/:testId/start` |
| session/question_screen (+ transition) | `/student/sessions/:sid/q/:n` |
| session/completion_screen | `/student/sessions/:sid/done` |
| home/student_progress_screen (XP, weekly, journey) | `/student/progress` |
| home/my_badges_screen | `/student/badges` |
| home/character_collection_screen | `/student/characters` |
| home/class_progress_screen (self-only readiness) | `/student/class-progress` |
| home/link_parent_screen | `/student/link-parent` |
| profile/student_profile_screen, how_to_earn_xp_screen | `/student/profile`, `/student/xp-rules` |

**Teacher:** class_list → `/teacher`; class_overview → `/teacher/classes/:id`; paper flow (config → prompt →
preview) → `/teacher/paper/new` (3 steps); test_status / test_content → `/teacher/tests`,
`/teacher/tests/:id`; student_review / bulk_validation / review_complete → `/teacher/classes/:id/review[...]`;
student detail/trend/notes/flags/interventions/metric explainability → `/teacher/students/:id/...`;
weekly_summary, class_analytics, class_comparison, history → `/teacher/analytics/...`;
parent_communication → `/teacher/students/:id/message-parent`; notification_settings → `/teacher/settings`.

**Parent:** child_selection → `/parent`; summary tabs (this week / 4-week / full journey) →
`/parent/children/:id`; subject_detail, past_summaries, monthly_report, activity_feed, engagement_dashboard,
learning_insights, performance_card, achievement_share, home_goals, conversation_starters, exam_guide,
devices, link-child, profile → `/parent/children/:id/...` and `/parent/{devices,link-child,profile}`.

**Principal:** dashboard → `/principal`; heatmap → `/principal/heatmap`; classes (+detail) →
`/principal/classes[/:id]`; directory (teachers, detail, insights, approvals, invite codes) →
`/principal/directory/...`; student search/detail/journey → `/principal/students[/:id]`; profile → `/principal/profile`.

**Admin:** keep the existing Flutter-Web admin panel initially; optional later port to the same React stack
(`/admin/...` mirroring `admin_panel/lib/presentation/screens/*`).

### 6.3 Privacy rules (must hold on web)
- **Students:** never see raw accuracy/percentages on the live flow; readiness shown as words. Self-only
  progress charts. Metric names obfuscated m01–m15 in DB/API.
- **Parents:** narratives only. `ParentSummary.internal_readiness_level` is server-side only; no scores, no
  percentages, no peer comparison anywhere in `/parent/*` UI.
- **Teacher/Principal aggregates:** distribution buckets and counts, no per-student names in charts;
  ClassReadinessAggregate stores only counts.
- **⚠ OPEN QUESTION — leaderboard vs privacy:** `GET /v1/student/class-rankings`
  (`backend/app/api/student.py:176-227`) returns a **full XP leaderboard with real student names, ranks,
  characters, streaks and levels** for the student's grade+section, and `GET /parent/children/{id}/class-ranking`
  exists in the parent router. This directly tensions the product's "no peer leaderboards / no public scores"
  stance documented elsewhere (the Flutter app currently exposes it as a character-flavored ranking screen).
  **Do not silently port or silently drop it** — product must decide: (a) keep XP-only leaderboard as a
  deliberate exception (XP ≠ scores), (b) anonymize ("You are #4 of 31"), or (c) remove. Until decided, the web
  app should hide the screen behind a feature flag.

---

## 7. Notifications

**Backend supports** (`backend/app/models/notification.py`, `backend/app/api/notifications.py`):
- In-app: `Notification` rows per recipient; per-role endpoints `GET .../notifications`,
  `.../unread-count`, `POST .../{id}/mark-read`, `.../mark-all-read`; dedup unique constraint on
  (recipient_id, notification_type, reference_id).
- Push: FCM via firebase-admin (`messaging.send_each_for_multicast`); `FCMToken.device_type` already supports
  `"web"`. Registration: `POST /v1/notifications/{role}/fcm-token` (+ `/deactivate`).
- Preferences per role with toggles + quiet hours (`HH:MM`).
- Triggers: test published / deadline reminders / results, all-students-completed → teacher, summary-ready →
  parent, class-analysis → principal, flags with notify_principal/notify_parent.

**Web plan:**
1. Phase 1 (zero backend change): in-app notification center polling `GET .../notifications` +
   `unread-count` (poll ~60 s or on route change).
2. Phase 2: FCM Web Push — add the Firebase web app config + a service worker
   (`firebase-messaging-sw.js`), request Notification permission, register token with
   `device_type: "web"` via the existing endpoint. Backend payloads use
   `click_action: FLUTTER_NOTIFICATION_CLICK` data — web SW should treat `data` payload generically.
3. Respect quiet hours server-side (already enforced at send time); web only manages preference UI.

---

## 8. Web App Parity Plan

### 8.1 Stack
- **Vite + React 18 + TypeScript + Tailwind CSS**, SPA, consuming the existing `/v1` backend unchanged.
- Routing: React Router with role-gated layouts (`/student/*`, `/teacher/*`, `/parent/*`, `/principal/*`).
- Data: TanStack Query (cache + retry/backoff mirroring `api_service.dart` — 3 retries, 1 s exponential base,
  60 s timeouts); auth tokens in memory + localStorage with the existing refresh endpoint; single Axios/fetch
  client with 401→refresh→retry interceptor (mirrors Flutter's `TokenExpiredException` flow).
- `device_id`: generated UUID persisted in localStorage (needed for parent login session caps).
- Design system: follow `MVP_APP/CLAUDE.md` (single primary + accent + grays, sp/rem units, responsive grids,
  320/375/414/768 breakpoints).

### 8.2 Ported vs displayed logic
| Logic | Where it lives on web |
|---|---|
| Metrics, readiness L1–L5, weighted accuracy, weekly averaging | **Backend only.** Web displays API output. TS ports exist solely for parity tests + optional local "explainability" rendering |
| XP awarding, anti-farming, streak math, quality multiplier | **Backend only** (returned in the `complete` response `gamification` block). Web shows `breakdown[]` verbatim |
| XP-rules explainer constants, level names/thresholds | TS constants module mirroring `xp_rules.dart` + `gamification_service.py:28-50` |
| Character catalog + unlock XP gates | TS port of `character_utils.dart` (client gate; server only validates ID) |
| Session flow state machine (modes, persistence prompt, skip handling, app-switch counting > 30 s via `visibilitychange`, per-question timer with 200 ms/600 s awareness) | Web client (mirrors Flutter screens) |
| Readiness display names mapping | TS port of `suggestion_model.dart` enum |

### 8.3 Parity unit tests (TS ports — DISPLAY/VERIFICATION ONLY; backend stays authoritative)
Port these pure functions 1:1 to `src/lib/parity/` and pin exact expected values:

1. `calculateWeightedAccuracy` — fixtures: 10 answered (4E correct, 3M correct of 4, 1H correct of 2) →
   w_acc = (4·1.0 + 3·2.0 + 1·3.5) / (4·1.0 + 4·2.0 + 2·3.5) = 13.5/19 = **0.7105**.
2. `calculateAir` — 8 answered + 1 gave-up of 10 → 0.9 → green; 6/10 → 0.6 → yellow; 5/10 → red.
3. `calculateTfa` — avg 2500 ms @ acc 0.75 → green "quick_knowledgeable"; 2500 ms @ 0.30 → red "rushing";
   20 s @ 0.5 → yellow "delayed"; 61 s → red "timeout".
4. `calculateOcb` — avg 0.4 @ acc 0.3 → red "clicking_through"; avg 2.0 @ 0.55 → green "reflective"; avg 2.6 → red.
5. `calculateHup` — rate 0.85 hinted-acc 0.25 → red; rate 0.85 hinted-acc 0.4 → yellow; rate 0 acc 0.3 → yellow.
6. `calculatePhe` — no hints acc 0.39 → yellow 0.5; hinted continued 4/5 → green 0.8.
7. `calculateScc` — completed, 10 Q, 80 s total, acc 0.4 → rushing_penalty 0.5 → score 0.5 → red;
   same time acc 0.6 → no penalty → green.
8. `calculateDpi` — 2 wrong → neutral; 4 wrong (2 persisted, 2 gave-up), 9/10 completed →
   engagement = (2 + 0.6)/4 = 0.65, score = 0.4·0.9 + 0.6·0.65 = 0.75 → green.
9. `calculateRgd` — verify NT15 threshold max(0.15·median, 1000); static fallbacks 2000/3000/5000;
   3 fast wrong of 4 fast, 10 attempted → effective = min(0.75, 0.3) = 0.3 → yellow;
   same but overall acc 0.7 → green "fast_knowledgeable".
10. `calculateFad` — difficulty-increase widening (0.20/0.40 vs 0.10/0.25), easy-only normalization,
    suspicious_improvement > 0.30, red categories at speed_ratio 0.69/1.31.
11. `calculateTcr` — CV per difficulty group; dump when last-3 avg < 0.3 × first-3 avg.
12. `calculateHsb` — strategic/unnecessary/missed counting incl. gave-up exemption; denom-0 accuracy branches.
13. `calculatePeb` — cascade-skip, rush (<0.3×avg), slow-on-hard resilience (>2.5×avg & med/hard).
14. `calculateEwp` — effort = t + 2000·changes + 3000·hints; efficiency exemption late_acc ≥ 0.85·early_acc.
15. `calculateGep` — pairwise Guttman errors; neutral on <4 answered.
16. `calculateDap` — all five ratio bands with hard_acc 0.69/0.70 boundary cases.
17. `calculateStudentTheta` — k = 0.4, static thetas, clamp ±3.0 (golden sequence test).
18. `calculateReadinessLevel` — at minimum these golden cases:
    - all-green, w_acc 0.81, 20% hard answered → **L5**;
    - same but 1 red → not L5, check L4 path;
    - air green, dpi yellow, scc green, rgd yellow, fad green, green=10, red=2, w_acc 0.56, hard 16% → **L4**;
    - test 10% hard, w_acc 0.76, exposure 0 → **L4** via easy-test bypass; w_acc 0.74 → **L3**;
    - w_acc 0.35 boundary → L3; 0.3499 → falls through;
    - rgd score 0.39 + air yellow + red=8 → **L2**; rgd 0.40 → **L1**;
    - verify neutral-counts-as-green using a <6-attempt FAD-neutral fixture.
19. XP pipeline `computeExpectedAward` (verification-only model of §4.2): perfect 10/10 no hints, first today,
    streak 7, readiness L4 → base = 40+10+5 = 55, streak +27 (55//2), quality int(82·1.25)=102 → assert against
    backend `breakdown[]` in an integration test; reattempt-same-week → `is_practice_only: true`, 0 XP.
20. Level/character helpers — `levelFor(49)=Explorer`, `levelFor(50)=Rising Star`, …, `unlockable(2500)` ⊇
    {6 starters, onyx, echo, fang, circuit}.
21. Weekly average — levels [3,4,3] → 3 "practicing"; [4,5] → round(4.5) — **pin Python's round-half-to-even
    (4.5 → 4)**, document, and match TS implementation explicitly (JS `Math.round(4.5)=5` differs!).

Each TS port carries a header comment pinning the Python source path + line range + a checksum date; CI runs
the fixtures; any backend change to these files must update fixtures.

### 8.4 Build-out order
1. Auth shell (all 5 logins, refresh, first-login) → 2. Student test loop (§5, the core) →
3. Student progress/badges/characters → 4. Teacher review + paper flow → 5. Parent → 6. Principal →
7. Notifications phase 2 (web push) → 8. Admin (optional port).

---

## 9. Gaps & Ambiguities (explicit flags — do not resolve silently)

1. **Class XP leaderboard vs "no peer comparison":** `GET /student/class-rankings` and
   `GET /parent/children/{id}/class-ranking` expose named, ranked XP leaderboards
   (`backend/app/api/student.py:176-227`) while design docs and parent privacy rules forbid peer comparison.
   OPEN PRODUCT QUESTION — ship behind a feature flag (§6.3).
2. **Stars are not a mechanic.** No student-facing star economy exists in code. Only the
   `persistence_star` GrowthCard *type* for parents (emotional copy "Our little star… ⭐"). Any product copy
   referring to "earning stars" must be reworded to XP/levels/characters.
3. **Curiosity bonus display mismatch:** backend awards **+1** (`gamification_service.py:191`) but the
   Flutter explainer shows **+3** (`xp_rules.dart:40` `curiousLearner = 3`). Backend wins (+1); fix the
   explainer copy in both clients or change the backend deliberately.
4. **App-switch penalty display mismatch:** explainer says flat −2 (`xp_rules.dart:54`), backend is −2 first,
   −3 each subsequent (`gamification_service.py:291`). Backend wins.
5. **Character XP gate is client-only:** `PUT /student/character` validates the ID list but not XP
   (`student.py:146-173`). A crafted request can equip apex at 0 XP. Recommend server-side gate; until then,
   web must replicate the client gate faithfully.
6. **DPI dead code:** the `if not wrong_attempts:` branch (`metrics_service.py:290-298`) is unreachable
   (the `<= 2 → neutral` check returns first). Do NOT port the dead branch; document it.
7. **CORS wide open:** `allow_origins=["*"]` (`main.py:104`). Must be restricted before web launch (§2.4).
8. **Weekly-average rounding:** Python `round()` is banker's rounding (4.5→4); JS `Math.round` rounds half up.
   Display-side TS must implement round-half-to-even to match (`teacher_service.py:949`).
9. **Deadline semantics:** deadline is *the Sunday of the NEXT week* at 23:59:59 (`models/test.py:16-26`),
   not the coming Sunday. Reports/docs that say "next Sunday" are imprecise; countdown UI must use the
   server-returned `deadline`, never recompute.
10. **Quality multiplier ordering quirk:** review/app-switch penalties are applied AFTER the multiplier and
    are unscaled (§4.2 steps 7→8). Any "expected XP" display must respect this order.
11. **Per-session XP can be negative:** only the cumulative `total_points` is floored at 0
    (`gamification_service.py:335`). UI should not assume `total_earned ≥ 0`.
12. **AIR's `questions_shown` = attempts created** (i.e., questions *viewed*, since attempts are created on
    view), not the test's `total_questions` (`metrics_service.py:811`). A student who never opens questions
    isn't directly penalized by AIR (but is by SCC/skip penalties). Note for explainability copy.
13. **Documentation lag:** `READINESS_MATH.md` describes the old 8-metric system and looser L4 gates; the
    code's 15-metric system (§3) is canonical. Likewise the exploration report `03_test_flow_scoring.md`
    summarized readiness gates with numbers not present in code (e.g. "L5: RGD < 0.05", "L4: RGD < 0.15",
    "L1: ≥4 red OR AIR red") — §3.4 here reflects the code exactly.
14. **Difficulty-flag thresholds** differ from older docs: code flags easy <40% pass, hard >85%, medium >90%
    or <25% (`validation_service.py:61-99`), not the "easy >60% / medium 25–60% / hard <25%" rubric quoted in
    report 03.
15. **FCM web push** requires a Firebase *web* app config + VAPID key not yet present in the repo — backend
    token storage is ready (`device_type: "web"`), client config is the gap.
16. **m16/OEP/ORB legacy slots:** `student_metrics.metric_type` historically allowed OEP/ORB/m16 values;
    active code writes only m01–m15. Web should read defensively (ignore unknown metric codes).
17. **`/auth/logout` is stateless** (client-side token discard); no server-side token revocation. Web should
    clear storage and treat as logged out; long-lived refresh tokens (7 d) remain valid — acceptable for MVP,
    flag for security review.

---

*End of parity contract. The backend code referenced above is the single source of truth; if this document and
the code ever disagree, the code wins and this file must be updated.*
