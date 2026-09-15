> Status: implemented on `main`. This is the accepted specification for the
> feature; see the rollout runbook for release steps in an existing database.

## Problem Statement

Students currently receive a schedule generated on request from one replaceable analytics record. That makes the plan non-historical, prevents reported progress from shaping future workload, loses analytics history, and allows later uploads or profile changes to change what a student sees for the same week. Students need a trustworthy Monday–Sunday plan that responds to current performance and realistic capacity while preserving the record they were given.

## Solution

Replace request-time schedule generation with a deterministic, persisted adaptive weekly schedule. A new current-week schedule is generated at most once per student per calendar week in the configured application timezone (`America/Chicago` initially), using a fresh approved analytics snapshot window and the immediately preceding week's activity check-ins. The schedule is immutable after saving; check-ins are separately editable. The student dashboard and read-only admin view display the same saved record. The public landing-page sample remains illustrative mock data.

## User Stories

1. As a student, I want my current week to have one saved weekly schedule, so that returning to the dashboard always shows the same plan.
2. As a student, I want my plan to use my latest approved 7Sage analytics, so that the work targets my current weak areas.
3. As a student, I want recent analytics to matter more than older analytics without erasing longer-term evidence, so that the plan responds to change while recognizing sustained trends.
4. As a student, I want one approved snapshot to be enough to establish a baseline, so that I do not have to wait for multiple uploads before receiving a plan.
5. As a student, I want missing skill rows to be handled without invented accuracy values, so that absent data does not falsely change my priorities.
6. As a student, I want an unusable, rejected, stale, or unconfirmed upload to leave me in a correction/upload state, so that bad analytics cannot silently drive my plan.
7. As a student, I want to confirm that extracted analytics match my screenshot and are my latest analytics before they affect planning, so that AI extraction remains verifiable.
8. As a student, I want to see the required Wednesday rest day, drilling days, Saturday practice test, and Sunday review in the weekly shape, so that I can orient quickly.
9. As a student, I want planned work to fit my stated daily capacity, so that the plan is realistic.
10. As a student, I want the full Saturday practice test to remain scheduled even when accommodation-adjusted time exceeds Saturday capacity, so that the required test is never silently dropped or shortened.
11. As a student, I want any Saturday overage to be shown clearly and to have no extra Saturday work added, so that I understand the exception.
12. As a student, I want a late-approved analytics snapshot to create work only for the remaining days of the current week, so that I am not assigned missed work retroactively.
13. As a student, I want missed weeks not to be backfilled, so that a new plan starts from the current calendar week.
14. As a student, I want to mark each schedule activity as not started, completed, or skipped, so that my progress is accurately represented.
15. As a student, I want actual minutes to be optional for completed activities, so that I can record useful effort without being forced to time every activity.
16. As a student, I want not started to remain distinct from skipped, so that unknown progress is not treated as failure to complete.
17. As a student, I want skipped planned minutes from the immediately preceding week to reduce future flexible workload, so that the next plan reflects what I could realistically complete.
18. As a student, I want completed work not to increase next week's target above baseline, so that the system does not escalate workload unexpectedly.
19. As a student, I want actual minutes to remain historical information rather than alter my stated capacity or reduction formula, so that the planning rules stay predictable.
20. As a student, I want to correct a check-in after the week ends, so that my history remains accurate.
21. As a student, I want a correction made before the next unsaved week is generated to influence that future plan, so that the next plan uses the best available history.
22. As a student, I want corrections never to mutate a previously saved weekly schedule, so that historical plans remain trustworthy.
23. As a student, I want Whole week and One day views to show the same check-in state, so that changing views does not create conflicting progress.
24. As a student, I want to see historical analytics snapshots retained, so that I can understand performance trends over time.
25. As an admin, I want read-only visibility into a student's saved weekly schedule and check-ins, so that I can provide oversight without changing student records.
26. As a student, I want access limited to my own analytics, schedules, and check-ins, so that my study data remains private.
27. As a student, I want account deletion to remove my linked snapshots, schedules, check-ins, and account, so that my active data is deleted together.
28. As an operator, I want an interrupted or repeated first visit to return one schedule, so that concurrent requests cannot create contradictory weekly plans.
29. As an operator, I want historical schedules to retain their generation inputs and policy version, so that a plan can be explained and reproduced without recalculation.
30. As an operator, I want the migration to preserve the surviving old analytics record as legacy history while excluding it from planning, so that migration does not invent provenance.

## Implementation Decisions

- Keep schedule generation deterministic and separate from persistence. The generation boundary accepts student capacity/profile, the current time, configured timezone, approved snapshot window, prior-week progress facts, and a named scheduling policy.
- Replace the current single-snapshot storage behavior with append-only approved analytics snapshots. Store approval time, confirmed extracted values, confirmation metadata, and legacy provenance. Retain older snapshots; use only the newest three eligible approved snapshots for planning.
- Use performance to select focus and reported progress to control workload. Use weights of 60% newest, 30% previous, and 10% oldest; renormalize when fewer snapshots exist. For a skill missing from a snapshot, renormalize only across snapshots reporting that skill. If absent from all retained snapshots, exclude it from adaptive ranking while preserving independent mandatory floors. Use only the newest approved snapshot for restricted yes/no priority flags.
- Add a persisted weekly schedule record keyed by student and Monday week-start date. Store generated time, immutable planned activities and minutes, source snapshot IDs, profile/capacity inputs, progress facts used at generation, and scheduling policy version.
- Add separately persisted activity check-ins keyed by schedule and activity. Enforce one check-in per activity, keep planned and actual minutes distinct, and clear completed-only actual minutes when status changes to skipped.
- Enforce uniqueness for one schedule per student/week and one check-in per schedule/activity. Make load-or-generate idempotent and safely re-read an existing record after a concurrent uniqueness conflict.
- Compute weeks and remaining days in the configured application timezone, initially `America/Chicago`. Do not make timezone student-editable in this scope.
- For prior-week progress, use only the immediately preceding saved weekly schedule. Compute skipped planned minutes divided by all prior planned minutes. Reduce the next normal workload by `min(25%, 25% × skipShare)`, trim flexible drills first, and do not copy skipped or unfinished activities.
- Preserve the established weekly shape where feasible: Wednesday rest, four drilling days, Saturday practice test, and Sunday review. All planned non-test work must fit daily stated capacity; omit indivisible work that does not fit. The full Saturday practice test is the sole capacity exception, remains intact, shows its overage, and receives no additional Saturday work.
- Require a fresh, approved, usable screenshot and student confirmation before generating a new schedule. No approved snapshot means no schedule; rejected/stale/unusable data returns to upload or correction. Generate only the current remaining week after late approval and never backfill prior weeks.
- Once saved, a weekly schedule's planned activities, capacity inputs, source references, and generation facts are immutable. Later uploads, profile edits, check-in corrections, and dashboard visits cannot change it.
- Replace student dashboard request-time generation with loading or generating the saved current-week record. Replace the admin generated view with the same saved record and check-ins in read-only mode. Leave the public landing-page example on mock data.
- Use the existing analytics extraction/review flow as the approval boundary; only confirmed extraction creates an append-only approved snapshot.
- For an existing database, use a database-first rollout: run the idempotent migrations, deploy snapshot/schedule/check-in persistence and generation code, and verify indexes and representative records before first real-user use. The dashboard/admin reads and generation use the replacement path; there is no feature flag.
- Do not add a scheduling rules-management UI. Preserve the deterministic policy and record its version on every schedule.

## Testing Decisions

- Prefer external behavior over implementation details. The primary seam is a load-or-generate-current-week application service using a fake clock/timezone and in-memory repositories; it should exercise lifecycle, generation, persistence, idempotency, immutability, and prerequisite behavior together.
- Retain the existing deterministic engine tests as focused domain tests for activity ordering, LR/RC shape, capacity behavior, accommodation timing, full-section behavior, and stable output. Update obsolete tolerance expectations to the new hard-cap rules and add the Saturday exception explicitly.
- Test exact one-, two-, and three-snapshot weighting, four-snapshot retention/window behavior, contradictory accuracy values, missing-row renormalization, absent-everywhere skills, newest-only restricted flags, deterministic tie-breaks, and stable ordering.
- Test prior-week progress with zero, partial, and complete skips; not-started neutrality; completed neutrality; planned-minute—not actual-minute—calculation; flexible-first trimming; mandatory floors; and the 25% maximum reduction.
- Test zero capacity, indivisible activities, accommodation-adjusted durations, the full Saturday exception, late approval, no remaining fit, current-timezone week boundaries, no backfill, and the fixed weekly shape.
- Test database uniqueness, repeated and concurrent first visits, immutable saved inputs, editable check-ins, completed-to-skipped minute clearing, Whole week/One day consistency, student ownership, admin read-only access, deletion cascade, and migration preservation/exclusion of legacy records.
- Use the repository's existing Vitest scheduling tests as prior art, and add service, persistence, route, and component tests only at the highest seams needed to verify observable behavior.
- The implementation is complete only when the full test suite, lint, and production build pass.

## Out of Scope

- AI-generated schedules or replacing deterministic scheduling rules with an LLM.
- Automatic granular question-level imports or 7Sage scraping.
- A student-editable or admin-editable scheduling policy.
- Backfilling missed weeks.
- Reconstructing overwritten analytics uploads or old schedules that cannot be recovered.
- Storing uploaded screenshot images.
- Billing, subscriptions, or referral discounts.
- Student-configurable timezones.

## Further Notes

- The existing domain glossary defines the canonical terms weekly schedule, schedule activity, activity check-in, analytics snapshot, performance trend, adaptive weekly schedule, scheduling policy version, and legacy analytics record.
- The architectural rationale is recorded in the ADR for persisted immutable adaptive weekly schedules.
- The initial migration must remove the old unique-per-student analytics constraint before append-only writes can operate safely. Privacy documentation should describe active-data deletion and finite backup retention before real-user release.
