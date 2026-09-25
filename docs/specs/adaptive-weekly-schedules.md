# Adaptive weekly schedules, policy v2

> Status: implemented in the current checkout. Saved `adaptive-weekly-schedule-v1` schedules retain their original plan and display.

## Record lifecycle

DrillMap saves one Monday–Sunday weekly schedule per student in the configured application timezone, initially `America/Chicago`. The deterministic `adaptive-weekly-schedule-v2` policy uses the student's study settings, a fresh approved analytics snapshot window, and check-ins on the immediately preceding saved week. Repeat and concurrent visits return the same schedule. Later uploads, setting changes, and check-in corrections affect only a schedule that has not yet been created.

The saved record holds the policy version, generation time and inputs, source snapshot IDs, day plans, daily capacities, and schedule reasons. Activity check-ins are separate, editable records. Students see their own saved schedule; the tutor's admin view reads the same schedule and reasons. Past v1 schedules remain readable without a v2 backfill. Account deletion removes the student's analytics snapshots, weekly schedules, activity check-ins, and account together.

An eligible analytics snapshot requires a fresh, usable 7Sage screenshot and student confirmation that the extraction matches and is the latest. The newest three eligible snapshots form the performance trend, weighted 60%, 30%, and 10%, with weights renormalized when fewer exist. A missing skill row contributes no invented accuracy; ranking uses only snapshots that report it. The newest snapshot supplies restricted priority flags. Without an eligible snapshot, the student returns to upload or correction.

## Study settings and weekly shape

- Students set capacity for each day in 15-minute steps, from 30 minutes through 8 hours, and choose a preferred practice-test day. The app stores capacity in minutes. No day may have zero capacity, and there is no default preferred day. Changes apply to the next schedule created.
- A normal week puts a full practice test on the preferred practice-test day and its practice-test review day on the following day. The usual rest day is Wednesday. If the practice test or its review takes Wednesday, rest moves to the day before the practice test. Remaining days are drilling days.
- A Sunday practice test puts its practice-test review day on Monday of the next weekly schedule. That schedule reads the preceding saved schedule to identify the carry-over, even if the student's preference has changed. If Monday is also the preferred practice-test day, that week places its practice test as if Tuesday were preferred. If the Monday review takes the rest day this produces, rest moves to the first free day from the schedule's creation onward.
- A week beginning within the calendar month before the goal test date, and before that date, is a near-test week. It schedules two LawHub practice tests three or four days apart, each followed by its practice-test review day. The second practice test falls on Thursday, Friday, Saturday, Monday, Tuesday, Wednesday, or Thursday when the preferred practice-test day is Monday through Sunday respectively. A second practice test that would fall on a Monday holding last week's practice-test review day is dropped.
- If the schedule is created after the preferred practice-test day, it contains no practice test that week. A schedule created on that day keeps the test. In a near-test week, a second practice test whose day has already passed is dropped, and the preferred-day test stays. Past non-rest days are unscheduled days, with no retroactive work; the computed rest day remains rest even if it has passed. Missed weeks are not backfilled.
- The practice test and its review each use the accommodation-adjusted full-test duration: 150 minutes at standard time, 187.5 at 1.5x, or 225 at 2x. Review holds no other activity.

## Filling drilling days

The policy walks active drilling days in Monday–Sunday order. Every drilling day receives a daily minimum of 10 LR questions or one RC passage, whichever subject is behind the week's drilling ratio of 10 LR questions per RC passage; ties choose LR. In the first LR pass, the LR daily minimum is two five-question drills. In the second pass, it is one complete second-pass unit: a ten-question drill or a paired 5+5 unit. At the boundary between the passes, it is the last five-question first-pass drill plus the next complete second-pass unit, for 15 questions. The daily minimum is assigned even when it exceeds daily capacity.

After the daily minimum, the engine adds the next complete unit of the subject behind the drilling ratio if it fits the day's fill limit. If it does not, it tries the other subject. It stops when neither fits. Review time is included in each item's estimate. LR question and regular RC passage estimates scale by 1, 1.25, and 1.5 for standard, 1.5x, and 2x accommodation.

LR drills put starred question types first, then restricted top-priority Stimulus Logic types, then other eligible types from weakest to strongest with stable list-order ties. Starred question types run weakest first. When the whole week cannot fit one drill of every starred type, starred rotation orders them least recently scheduled first, then by weakness and list order; non-starred types wait. "Least recently scheduled" uses the student's saved weekly schedules: a skipped drill still counts as scheduled, and a full section does not. A complete LR unit is a five-question first-pass drill, a ten-question second-pass drill, or an indivisible paired 5+5 second-pass unit. RC passage type and difficulty follow deterministic cycles. The day alternates which subject appears first.

One full LR or RC section goes on the remaining drilling day with the most daily capacity, with earlier days winning ties. It alternates subject from the student's most recent saved full section, starting with LR when none exists. The full section satisfies that day's daily minimum but does not count toward the drilling ratio or starred coverage. Drop it only when the current score is below 150 or no remaining drilling day has at least 60 minutes of daily capacity.

Skipped planned minutes divided by all planned minutes in the immediately preceding saved week give `skipShare`. The next week's per-day fill limit is `daily capacity × (1 − min(25%, 25% × skipShare))`. Not-started work is neutral, completed work does not raise the limit, and actual minutes are historical only. The reduction applies before filling and never removes a daily minimum or full section. The daily minimum and full section count toward the fill limit, and no work is added above the daily minimum once the fill limit would be exceeded. A daily minimum, full section, practice test, or practice-test review day may exceed daily capacity; the saved day records its capacity overage.

## Student-facing schedule

Each day card shows planned time against the capacity saved with that schedule. Capacity overage is the only warning. It appears on the affected card with an icon, the overage and capacity, a saved reason sentence, and a link to Study settings on This week. That link changes future schedules only. Unscheduled days have a distinct dashed card. The rest day, a near-test week, a week without a practice test, and a practice-test review day carried from last week use plain labels.

The policy saves a schedule reason, with a code, week or day placement, and final sentence, for each policy departure at creation. Schedule reasons cover capacity overage, skip reduction, starred rotation, a dropped full section, a moved rest day, no practice test, a near-test week, an unscheduled day, a practice-test review day carried over from last week's Sunday practice test, and a practice-test review day due next Monday. The baseline drilling ratio and LR type focus get no schedule reason. Past sentences never change when policy wording changes. The admin view shows the same saved sentences.

Activities identify their count, type, and difficulty, and practice tests and full sections identify their source PT range. Students can mark activities not started, completed, or skipped, with optional actual minutes for completed work. Changing a check-in from completed to skipped clears its actual minutes. Whole week and One day show the same check-in status. A later correction changes the check-in, not the saved plan.

## Verification and release

Engine, service, repository, route, and component tests cover deterministic placement, per-day capacity, accommodations, analytics weighting, skip reduction, saved inputs and reasons, v1 display, access control, and concurrent creation. Run `npm test`, `npm run lint`, and `npm run build` for the implementation gate.

## Scope limits

Scheduling remains deterministic. The app does not use an LLM to create, modify, explain, or review a weekly schedule. It does not scrape 7Sage, import questions individually, store screenshot images, backfill missed weeks, or offer an editable scheduling policy or timezone.
