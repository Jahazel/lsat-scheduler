# Current weekly scheduling rules for testing

This guide describes the live DrillMap schedule generator, policy `adaptive-weekly-schedule-v3`, as implemented in this checkout on October 21, 2026. It is for checking the weekly study schedules the site creates. The schedule is determined by saved inputs and rules. Claude reads rows from 7Sage screenshots, but it does not choose or revise the schedule. The student checks the extracted values before saving them.

## How to run a useful test

1. Set the student's current score, goal test month, accommodation, preferred practice-test day, and capacity for each weekday in Study settings. Capacity must be 30 to 480 minutes per day, in 15-minute steps.
2. For a new week, confirm a weekly upload or, on an admin's own student side, confirm the sample data. A new schedule needs an upload that **counts for that Monday–Sunday week**: one confirmed Monday through Friday of that week, or Saturday or Sunday of the week before. Earlier snapshots may also contribute to the trend.
3. Open This week and record the schedule's Monday date, creation day, all seven day types, activity labels, each day's planned total against its capacity, and the reason sentences. The app uses the `America/Chicago` calendar week.
4. For tests of the practice test's effect, confirm a weekly upload with practice-test screenshots on Saturday or Sunday, then move to the next Monday and open the new schedule. Or, from Monday to Friday of a week with no weekly schedule, confirm "Plan this week" with last week's practice test; it builds the schedule from today to Sunday at once.

The first visit that creates a week's schedule fixes it. Reloading, confirming more uploads, changing settings, or checking off activities in the same week does not change the saved plan. Those changes can affect a later week. An admin can use **Rebuild this week** on their own student side to delete that week's test schedule and check-ins, then create it again. That control does not apply to other students' schedules. The admin's simulated date moves forward only and affects only their own student side.

## Analytics and priority

- The generator uses the three newest eligible approved snapshots that count for this week or an earlier week, provided at least one counts for this week. Their accuracy weights are 60%, 30%, and 10%, newest first. With fewer snapshots, it rescales the available weights. If a question type is missing from a snapshot, it uses only snapshots that report that type.
- The newest snapshot alone supplies the restricted Stimulus Logic types flagged `HIGHEST` priority. A `MEDIUM` or `LOW` flag does not qualify. Missing accuracy rows are not invented.
- RC passage-type accuracy is weighted the same way. It orders RC passage types from lowest to highest accuracy; equal accuracies use the fixed order Art, Humanities, Science, Law, Comparative, and a type with no accuracy goes last.
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

A practice test takes 150 planned minutes at standard time. Its review gets the same duration and no other activity. The accommodation choices displayed as 1.5× time and 2× time use scheduling factors of **1.25** and **1.5**, respectively, so practice test and review durations are 187.5 or 225 minutes. Practice tests and review can exceed the student's daily capacity with no limit and no notice.

## What goes on a drilling day

The generator walks active drilling days from Monday to Sunday. It tracks a weekly drilling ratio of **10 LR questions for each RC passage**. Full sections and practice tests do not count toward that ratio. The subject currently behind the ratio gets the next unit; a tie starts with LR. The visible order of LR and RC groups alternates between drilling days.

Every drilling day lands in its **fill window**: no more than 10 minutes under its daily capacity and no more than 30 minutes over. A regular LR question is estimated at 3 minutes and an RC passage at 17 minutes 15 seconds, including review; accommodation factors apply to these estimates.

1. **Daily minimum.** Every drilling day without the full section receives either the next LR line or one RC passage. It is assigned even if it exceeds daily capacity.
2. **Paired LR drill.** If the week still owes a paired LR drill, it goes in as soon as it fits, at most one per day. On a day too small for both, the paired LR drill becomes the daily minimum.
3. **Filling.** While the day is below its daily capacity, the generator adds the next LR line or a 2-passage RC drill, favoring the subject behind the ratio. It adds only units that keep the day at or below capacity plus 30 minutes. When neither fits, it tries a 5-question LR line. It stops when nothing fits.

**LR lines.** The first pass gives each type one 5-question line. After that, each line is 10 questions of one type. There is never an LR line of 25 questions of one type. First-time LR lines use difficulty L2–4 below a current score of 165, or L3–5 at 165 or higher. Every line after the first pass uses L3–5.

**LR type order.** The six starred LR types are Conditional reasoning, Flaw or descriptive weakening, Necessary assumption, Strengthen, Sufficient assumption, and Weaken. They come first, weakest accuracy first. Next come restricted Stimulus Logic types marked `HIGHEST` in the newest snapshot. Other reported Question Stem types and the regular Logic exceptions, Diagram, Math, and Conditional reasoning, follow from weakest to strongest. Unreported regular types do not enter that later pool.

When the week cannot fit one line for every starred type, the generator schedules only starred types. It puts the least recently scheduled types first, then uses accuracy and fixed list order to break ties. Every line in a saved schedule counts as scheduled, whether or not it was checked off. Both types of a paired LR drill count. A full section does not.

**Paired LR drills.** A paired LR drill is one line of 10 questions across two types from the tutor's list: Strengthen + Weaken, Flaw or descriptive weakening + Weaken, Strengthen + Most strongly supported, Must be true + Must be false, Parallel flawed method of reasoning + Parallel method of reasoning, and Sufficient assumption + Necessary assumption. The pair is the one holding the highest-ranked type in the week's LR order, named first. A current score of 160 or higher gets 2 paired lines on the first 2 drilling days where they fit; a score of 159 or lower gets exactly 1. A week with one drilling day left gets 1. The pair uses L2–4 below 165 and L3–5 at 165 or higher.

**RC drills.** The daily minimum is 1 passage. Every other RC drill is 2 passages of two different types on one line. Types follow the RC order above, lowest accuracy first, in a repeating cycle. A 1-passage drill gets a level from L2 to L5; a 2-passage drill takes L2 and L4, L3 and L5, then L3 and L4, in turn.

**Full section.** The generator also places **one full LR or RC section** on the remaining drilling day with the highest stated capacity; an earlier day wins a tie. That day needs at least 60 minutes of stated capacity. The section is omitted when the current score is below 150 or no remaining drilling day qualifies. It starts with LR, then alternates from the most recently saved full section. It takes 60, 75, or 90 planned minutes by accommodation, counts as that day's minimum, and does not count toward the 10:1 ratio or starred coverage. The rest of that day is still filled to its fill window.

## Effect of the practice test

The weekly upload reads the four section screenshots of the week's practice test. A question counts as missed when it is wrong or unanswered. A result the screenshot hides counts as missed or correct when the section's 7Sage score settles it; otherwise the student picks. Each question-stem tag on a missed LR question counts once. RC sections and logic-type tags do not count.

The type missed most goes **first** in the next week's LR order, ahead of the starred types. Equal counts go to the type with lower trend accuracy, then the fixed list order. The week shows "<Type> comes first this week. You missed it most on your last practice test." This lasts one week. A week with no practice test asks only for analytics screenshots, and the next week has no missed type first. Checked-off and unfinished activities do not change the next week's plan.

## What to expect in the interface

Each day header shows planned time against the capacity saved with that schedule, for example "Drilling · 1 h 37 min of 1 h 30 min". Lines show no minutes and no capacity-overage notice. Labels read "1 Full LR Section", "10 Necessary + Sufficient assumption (L2-4)", "1 Law passage (L3)", or "1 Humanities + 1 Science passage (L3-4)". Reasons appear for the missed type that goes first, a moved rest day, starred rotation, omitted full section, no practice test, near-test week, unscheduled day, and a practice-test review that crosses a week boundary. Past schedules keep their original activities, capacities, and reason wording. A student checks off an activity with one tap and can undo it without changing its planned work. On Saturday and Sunday, a reminder links to "Plan next week" until next week's upload is confirmed.

For targeted checks, try a Tuesday or Wednesday preferred test day, a Sunday test followed by a new Monday, a week opened after its preferred test day, a week within one calendar month of the goal test date, a current score of 149 versus 150 or 159 versus 160, low daily capacity with each accommodation, RC accuracy with a clear lowest type, and a Saturday upload whose practice test missed one type most. Change one input at a time and create or rebuild a new test week before comparing results.

The detailed implementation is in [`src/lib/engine.ts`](../src/lib/engine.ts), [`src/lib/currentWeeklySchedule.ts`](../src/lib/currentWeeklySchedule.ts), [`src/lib/practiceTestResult.ts`](../src/lib/practiceTestResult.ts), and [`src/lib/mockData.ts`](../src/lib/mockData.ts). The [policy specification](specs/adaptive-weekly-schedules.md) records the same policy in technical terms.
