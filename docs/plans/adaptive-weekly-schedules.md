# Adaptive weekly schedules: implementation plan

Status: implemented on `main`. This document records the completed design and
implementation scope; use the rollout runbook for environment-specific release
steps.

## Goal

Replace the current generated-on-request schedule with a deterministic, persisted adaptive weekly schedule. Use the student's performance trend to select focus, and the immediately preceding week's reported progress to adjust flexible workload. Preserve the existing Wednesday rest day, four drilling days, Saturday practice test, and Sunday review shape where capacity allows.

## Settled product rules

- A weekly schedule is one immutable Monday–Sunday record in the configured application timezone (`America/Chicago` initially).
- Save at most one schedule per student per week. Repeat and concurrent visits return the same record.
- Only the immediately preceding saved week's check-ins affect the next week's workload. `not started` is neutral; `skipped` reduces workload; `completed` does not increase it.
- Calculate `skipShare` from skipped planned minutes divided by all prior planned minutes. Reduce the next normal workload by `min(25%, 25% × skipShare)`, trimming flexible drills first. Actual minutes are historical only.
- Use the newest three approved analytics snapshots with weights 60% / 30% / 10%; renormalize when fewer exist. Missing skill rows use evidence-only renormalization; never impute. Skills absent from all retained snapshots leave adaptive ranking but do not remove independent mandatory floors.
- Require a fresh, approved, usable screenshot whose extraction the student confirmed as matching and latest. No approved snapshot means no new schedule.
- Late approval plans only remaining calendar days. Missed weeks are not backfilled. A saved week's plan never changes after later uploads, profile edits, or check-in corrections.
- The full Saturday practice test remains scheduled even if its accommodation-adjusted duration exceeds Saturday capacity; show the overage and add no further Saturday work. All other planned work respects daily stated capacity, omitting indivisible work that does not fit.
- Students can edit check-ins at any time. Each activity has `not started`, `completed`, or `skipped`; actual minutes are optional only for completed activities, and changing completed to skipped clears completed-only minutes.
- Admin access remains read-only. Students can access only their own snapshots, schedules, and check-ins.

## Implemented slices

### 1. Establish contracts and policy inputs

- Define domain types for approved/legacy analytics, weekly schedules, schedule activities, and activity check-ins.
- Separate pure generation inputs from persistence concerns: student capacity/profile, current local date, approved snapshot window, prior-week progress facts, and a named scheduling policy version.
- Extract the existing rules from `mockRules` into a production policy/configuration boundary. Keep generation deterministic with stable tie-breaking and activity ordering.
- Add the configured timezone and policy version to application configuration.

### 2. Add persistence and migration

- Extend the analytics model to append approved snapshots with approval time, confirmed values, confirmation metadata, and legacy status/provenance.
- Add a weekly schedule model containing student/week identity, generated time, immutable planned activities and minutes, source snapshot IDs, capacity/profile inputs, progress facts, and policy version.
- Add a separate activity check-in model keyed uniquely by `(scheduleId, activityId)`.
- Add unique `(studentId, weekStartDate)` and snapshot/query indexes.
- Write an idempotent migration that preserves the surviving old analytics document as a legacy record, removes the old unique-per-student analytics index, and creates the new indexes. Do not reconstruct overwritten uploads or historical schedules.
- Ensure account deletion cascades through student-linked snapshots, schedules, and check-ins.

### 3. Refactor generation and lifecycle

- Implement local-week calculation from the configured timezone, including UTC boundary tests.
- Implement the rolling snapshot window, weights, missing-row renormalization, and newest-only restricted flags.
- Implement prior-week skip reduction using planned minutes and flexible-work trimming.
- Enforce daily caps, the explicit Saturday test exception, late-week remaining-day behavior, and no-backfill behavior.
- Create an idempotent “load or generate current week” service. It should check for an existing record, generate only when the current week is absent and prerequisites are satisfied, and handle concurrent first visits through the database uniqueness guard plus safe re-read.
- Capture all generation inputs in the saved record; never recalculate a saved plan.

### 4. Replace application surfaces

- Update the student dashboard to load the saved current-week schedule or show the appropriate upload/prerequisite state.
- Update analytics review so only student-confirmed, fresh, usable extraction creates an approved append-only snapshot.
- Add Whole week / One day check-in views using the activity-card design, with completed/skipped controls and optional actual minutes.
- Add authenticated student check-in writes and correction behavior.
- Update the admin student view to display the same saved schedule and check-in state read-only.
- Leave the public landing-page sample schedule on mock data; it is illustrative and not a student record.

### 5. Verify and roll out

- Add engine tests for weighted trends, missing data, deterministic ties, capacity, skip reductions, mandatory floors, Saturday exception, and late-week plans.
- Add persistence/service tests for uniqueness, idempotency, concurrent generation, immutable saved inputs, check-in corrections, access control, and deletion.
- Add route/component tests for upload approval, no-snapshot states, Whole week / One day consistency, and admin read-only behavior.
- Verify the current commands: `npm test`, `npm run lint`, and `npm run build`.
- For an existing database, run the idempotent migrations before first use, deploy the append-only snapshot, persisted schedule, and check-in code, and verify indexes and representative records. The dashboard and admin paths use the persisted schedule path; there is no feature flag.

## Acceptance matrix

1. One approved snapshot generates a baseline; two and three snapshots produce exact 2/3–1/3 and 60/30/10 weighted results; a fourth leaves the oldest outside the planning window but retained.
2. Missing skill rows renormalize only over reporting snapshots; absent-everywhere skills are excluded from ranking without disabling mandatory floors.
3. A prior week with 50% skipped planned minutes reduces a 600-minute normal workload by 75 minutes; untouched activities are neutral; actual minutes do not affect the formula.
4. Every non-test planned minute fits daily capacity; zero-capacity days receive no flexible work; the full Saturday test remains visible with an explicit overage.
5. Late approval creates only remaining-week work; no prior week is backfilled; no-data, rejected, stale, and unusable uploads cannot generate a schedule.
6. Repeated/concurrent visits return one identical saved plan; later snapshots, profile edits, check-in corrections, and visits cannot mutate it.
7. Check-in status and optional actual minutes behave consistently in both views, including correction and completed-to-skipped clearing.
8. Student ownership, admin read-only access, account deletion, migration preservation, stable ordering, and timezone-boundary behavior are covered.

## Explicit non-goals

- AI-generated scheduling or replacing the deterministic engine.
- Automatic question-level imports from 7Sage.
- A rules-management UI.
- Recovery of overwritten historical analytics or reconstruction of old schedules.
