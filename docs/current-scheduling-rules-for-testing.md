# Current weekly scheduling rules for testing

This guide describes the live DrillMap schedule generator, policy `adaptive-weekly-schedule-v2`, as implemented in this checkout on September 29, 2026. It is for checking the weekly study schedules the site creates. The schedule is determined by saved inputs and rules. Claude reads rows from a 7Sage screenshot, but it does not choose or revise the schedule. The student reviews the extracted rows before saving them.

## How to run a useful test

1. Set the student's current score, goal test month, accommodation, preferred practice-test day, and capacity for each weekday in Study settings. Capacity must be 30 to 480 minutes per day, in 15-minute steps.
2. For a new week, approve a fresh analytics extraction or, on an admin's own student side, approve a sample analytics snapshot. A new schedule needs an approved snapshot **from that Monday–Sunday week**. Earlier snapshots may also contribute to the trend.
3. Open This week and record the schedule's Monday date, creation day, all seven day types, activities, planned minutes, capacity warnings, and reason sentences. The app uses the `America/Chicago` calendar week.
4. For tests involving progress, mark activities completed or skipped in that week, then move to the next Monday and approve new analytics before opening the new schedule.

The first visit that creates a week's schedule fixes it. Reloading, approving more analytics, changing settings, or correcting check-ins in the same week does not change the saved plan. Those changes can affect a later week. An admin can use **Rebuild this week** on their own student side to delete that week's test schedule and check-ins, then create it again. That control does not apply to other students' schedules. The admin's simulated date moves forward only and affects only their own student side.

## Analytics and priority

- The generator uses the three newest eligible approved snapshots, including older weeks when the current week has an approval. Their accuracy weights are 60%, 30%, and 10%, newest first. With fewer snapshots, it rescales the available weights. If a question type is missing from a snapshot, it uses only snapshots that report that type.
- The newest snapshot alone supplies the restricted Stimulus Logic types flagged `HIGHEST` priority. A `MEDIUM` or `LOW` flag does not qualify. Missing accuracy rows are not invented.
- LR accuracy orders eligible question types from weakest to strongest. Equal accuracies use the fixed type-list order. The student's goal score does not directly change drill selection; the **current** score controls the full-section and LR difficulty rules below.
- The schedule is a shopping list of type, quantity, difficulty, and source range. It does not select individual LSAT question numbers. Ordinary drills use material below PT 130; regular weekly practice tests use PT 130 or later. Near-test practice tests use LawHub.

## Shape of the week

| Condition | Expected result |
| --- | --- |
| Normal week | One practice test on the preferred day. The next day is reserved for practice-test review. Wednesday is the usual rest day. Other available days are drilling days. |
| Practice test or review occupies Wednesday | Rest moves to the day before the practice test. For a Tuesday test this is Monday; for a Wednesday test this is Tuesday. |
| Sunday practice test | Its review is on the following Monday, in the next weekly schedule. That Monday remains review even if the preferred test day changes. |
| Monday review carried from last Sunday, with Monday preferred for the new test | The new week follows Tuesday's test placement. If the carried review also occupies the computed rest day, rest moves to the first free day from the schedule's creation day onward. |
| Week starts within one calendar month before the goal test date, and before that date | A near-test week normally has two LawHub practice tests, three or four days apart, each followed by review. The second test is Thursday, Friday, Saturday, Monday, Tuesday, Wednesday, or Thursday for a Monday-through-Sunday preferred day, respectively. A second test on Monday is omitted if that Monday holds a carried review. |
| Schedule first created after the preferred test day | No practice test is added that week. Creating it on the preferred day keeps the test. A near-test week's second test is omitted if its day has passed. |
| Schedule first created midweek | Earlier non-rest days say unscheduled and get no retroactive activities. The computed rest day remains rest, even if it has passed. Missed weeks are not created later. |

A practice test takes 150 planned minutes at standard time. Its review gets the same duration and no other activity. The accommodation choices displayed as 150% and 200% extra time use scheduling factors of **1.25** and **1.5**, respectively, so practice test and review durations are 187.5 or 225 minutes. Practice tests and review can exceed the student's daily capacity; the affected day shows the overage.

## What goes on a drilling day

The generator walks active drilling days from Monday to Sunday. It tracks a weekly drilling ratio of **10 LR questions for each RC passage**. Full sections and practice tests do not count toward that ratio. The subject currently behind the ratio gets the next unit; a tie starts with LR. The visible order of LR and RC groups alternates between drilling days.

Every drilling day receives a minimum: either 10 LR questions or one RC passage. Early LR coverage uses two five-question drills. Later LR coverage uses a ten-question drill or an indivisible pair of five-question drills. At the boundary between those passes, the minimum can be 15 LR questions. The minimum is assigned even if it exceeds daily capacity.

After that minimum, the generator adds complete units while they fit the day's **fill limit**. It tries the subject behind the 10:1 ratio first, then the other subject if the first does not fit. It stops when neither fits. A regular LR question is estimated at 3 minutes and an RC passage at 17 minutes 15 seconds, including review; accommodation factors apply to these estimates. A day's required minimum and full section count toward the fill limit but may exceed it. Optional units cannot push the day above it.

The six starred LR types are Conditional reasoning, Flaw or descriptive weakening, Necessary assumption, Strengthen, Sufficient assumption, and Weaken. They come first, weakest accuracy first. Next come restricted Stimulus Logic types marked `HIGHEST` in the newest snapshot. Other reported Question Stem types and the regular Logic exceptions, Diagram, Math, and Conditional reasoning, follow from weakest to strongest. Unreported regular types do not enter that later pool.

When the week cannot fit one drill for every starred type, the generator schedules only starred types. It puts the least recently scheduled types first, then uses accuracy and fixed list order to break ties. A skipped drill still counts as previously scheduled for this rotation. A full section does not. Some 10-question LR units split into paired 5+5 types; the pair stays together. First-time LR types use difficulty L2–4 below a current score of 165. After a type has appeared, or when the score is at least 165, they use L3–5. RC cycles through Art, Humanities, Science, Law, and Comparative, with a fixed difficulty sequence.

The generator also places **one full LR or RC section** on the remaining drilling day with the highest stated capacity; an earlier day wins a tie. That day needs at least 60 minutes of stated capacity. The section is omitted when the current score is below 150 or no remaining drilling day qualifies. It starts with LR, then alternates from the most recently saved full section. It takes 60, 75, or 90 planned minutes by accommodation, counts as that day's minimum, and does not count toward the 10:1 ratio or starred coverage.

## Effect of skipped work

Only check-ins on the **immediately preceding saved week** reduce the new week's optional work. The generator divides the planned minutes of activities marked skipped by all planned activity minutes in that week. Each new drilling day's fill limit is:

`daily capacity × (1 − min(25%, 25% × skipped share))`

For example, skipping activities worth 40% of last week's planned minutes cuts the next week's fill limit by 10%. Skipping all planned minutes cuts it by at most 25%. Unstarted activities are neutral; completed work does not add capacity. Entered actual minutes are recorded for progress but do not change the calculation. The reduction never removes a daily minimum or qualifying full section.

## What to expect in the interface

Each day shows planned time against the capacity saved with that schedule. A day that exceeds capacity shows the overage and a saved reason. Reasons also appear for a moved rest day, skip reduction, starred rotation, omitted full section, no practice test, near-test week, unscheduled day, and a practice-test review that crosses a week boundary. Past schedules keep their original activities, capacities, and reason wording. A student may revise an activity's check-in without changing its planned work.

For targeted checks, try a Tuesday or Wednesday preferred test day, a Sunday test followed by a new Monday, a week opened after its preferred test day, a week within one calendar month of the goal test date, a current score of 149 versus 150, low daily capacity that forces an overage, and a following week after marking some planned minutes skipped. Change one input at a time and create or rebuild a new test week before comparing results.

The detailed implementation is in [`src/lib/engine.ts`](../src/lib/engine.ts), [`src/lib/currentWeeklySchedule.ts`](../src/lib/currentWeeklySchedule.ts), and [`src/lib/mockData.ts`](../src/lib/mockData.ts). The [policy specification](specs/adaptive-weekly-schedules.md) records the same policy in technical terms.
