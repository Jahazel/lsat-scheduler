# Adaptive weekly schedules, policy v2

> Status: implemented in the current checkout. The tutor's eight Level 2 scenario reviews remain a release step. Saved v1 schedules retain their original plan and display.

## Record lifecycle

DrillMap saves one Monday–Sunday weekly schedule per student in the configured application timezone, initially `America/Chicago`. The deterministic `adaptive-weekly-schedule-v2` policy uses the student's study settings, a fresh approved analytics snapshot window, and check-ins on the immediately preceding saved week. Repeat and concurrent visits return the same schedule. Later uploads, setting changes, and check-in corrections affect only a schedule that has not yet been created.

The saved record holds the policy version, generation time and inputs, source snapshot IDs, day plans, daily capacities, and schedule reasons. Activity check-ins are separate, editable records. Students see their own saved schedule; the tutor's admin view reads the same schedule and reasons. Past v1 schedules remain readable without a v2 backfill.

An eligible analytics snapshot requires a fresh, usable 7Sage screenshot and student confirmation that the extraction matches and is the latest. The newest three eligible snapshots form the performance trend, weighted 60%, 30%, and 10%, with weights renormalized when fewer exist. A missing skill row contributes no invented accuracy; ranking uses only snapshots that report it. The newest snapshot supplies restricted priority flags. Without an eligible snapshot, the student returns to upload or correction.

## Study settings and weekly shape

- Students set capacity for each day in 15-minute steps, from 30 minutes through 8 hours, and choose a preferred practice-test day. The app stores capacity in minutes. No day may have zero capacity, and there is no default preferred day. Changes apply to the next schedule created.
- A normal week puts a full practice test on the preferred day and review alone on the following day. The usual rest day is Wednesday. If the test or review takes Wednesday, rest moves to the day before the practice test. Remaining days are drilling days.
- A Sunday practice test creates a review-only Monday in the next weekly schedule. That schedule reads the preceding saved schedule to identify the carry-over, even if the student's preference has changed.
- A week beginning within the calendar month before the goal test date, and before that date, is a near-test week. It schedules two LawHub practice tests three or four days apart, each followed by a review-only day. The second test day is Thursday, Friday, Saturday, Monday, Tuesday, Wednesday, or Thursday when the preferred day is Monday through Sunday respectively.
- If the schedule is created after the preferred practice-test day, it contains no practice test that week. A schedule created on that day keeps the test. Past non-rest days are unscheduled, with no retroactive work; the computed rest day remains rest even if it has passed. Missed weeks are not backfilled.
- The practice test and its review each use the accommodation-adjusted full-test duration: 150 minutes at standard time, 187.5 at 1.5x, or 225 at 2x. Review holds no other activity.

## Filling drilling days

The policy walks active drilling days in Monday–Sunday order. Every drilling day receives at least 10 LR questions or one RC passage, whichever subject is behind the week's 10:1 LR-question-to-RC-passage pace; ties choose LR. A basic LR minimum uses two five-question drills. At the boundary between the first and second LR passes, it uses the last five-question first-pass drill plus the next complete second-pass unit, for 15 questions. The minimum is assigned even when it exceeds capacity.

After the minimum, the engine adds the next complete unit of the subject behind the 10:1 pace if it fits the day's fill limit. If it does not, it tries the other subject. It stops when neither fits. Review time is included in each item's estimate. LR question and regular RC passage estimates use multipliers of 1, 1.25, and 1.5 for standard, 1.5x, and 2x accommodations.

LR drills put starred question types first, then restricted top-priority Stimulus Logic types, then other eligible types from weakest to strongest with stable list-order ties. When the whole week cannot fit one drill of every starred type, starred rotation uses the least recently scheduled type first, then weakness and list order; non-starred types wait. A complete LR unit is a five-question first-pass drill, a ten-question second-pass drill, or an indivisible paired 5+5 second-pass unit. RC passage type and difficulty follow deterministic cycles. The day alternates which subject appears first.

One full LR or RC section goes on the remaining drilling day with the most stated capacity, with earlier days winning ties. It alternates subject from the student's most recent saved full section, starting with LR when none exists. The full section satisfies that day's minimum but does not count toward the 10:1 drilling ratio or starred coverage. Drop it only when the current score is below 150 or no remaining drilling day has at least 60 minutes of stated capacity.

Skipped planned minutes divided by all planned minutes in the immediately preceding saved week give `skipShare`. The next week's per-day fill limit is `daily capacity × (1 − min(25%, 25% × skipShare))`. Not-started work is neutral, completed work does not raise the limit, and actual minutes are historical only. The reduction applies before filling and never removes a daily minimum or full section. Above the minimum, the fill limit is a hard cap. A mandatory minimum, full section, practice test, or review may exceed stated capacity; the saved day records its overage.

## Student-facing schedule

Each day card shows planned time against the capacity saved with that schedule. Capacity overage is the only warning. It appears on the affected card with an icon, the overage and capacity, a saved reason sentence, and a link to Study settings on the current week. That link changes future schedules only. Unscheduled days have a distinct dashed card. The rest day, near-test week, no-test week, and carried review use plain labels.

V2 saves a code, week or day placement, and final sentence for each policy departure at creation. Reasons cover capacity overage, skip reduction, starred rotation, a dropped full section, a moved rest day, no practice test, a near-test week, an unscheduled day, review carried over from Sunday, and a Sunday review due next Monday. The baseline drilling ratio and LR type focus do not get explanations. Past sentences never change when policy wording changes. The admin view shows the same saved sentences.

Activities identify their count, type, and difficulty, and practice tests and full sections identify their source PT range. Students can mark activities not started, completed, or skipped, with optional actual minutes for completed work. A later correction changes the check-in, not the saved plan.

## Verification and release

Engine, service, repository, route, and component tests cover deterministic placement, per-day capacity, accommodations, analytics weighting, skip reduction, saved inputs and reasons, v1 display, access control, and concurrent creation. Run `npm test`, `npm run lint`, and `npm run build` for the implementation gate.

Before release, review eight v2 scenarios with the tutor: baseline, very low capacity, uneven daily capacity, a non-Saturday preferred practice-test day, a near-test week, a score below 150, 2x accommodation, and a schedule created late in the week. For each, record the answer to "Would you give this to a student?" and any note. Resolve rejected scenarios before release. The proposed 25-percentage-point day-fill discrepancy threshold still needs tutor confirmation; no automatic rejection checker or generated capacity sweep is part of this release.

## Scope limits

Scheduling remains deterministic. The app does not use an LLM to create, modify, explain, or review a weekly schedule. It does not scrape 7Sage, import questions individually, store screenshot images, backfill missed weeks, or offer an editable scheduling policy or timezone.
