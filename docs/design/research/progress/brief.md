# Design brief: Progress

Tracking ticket: #334

## Job
A student opens Progress to look back at their past weekly schedules: what each week asked of them and how much they checked off.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Any student page | Taps the Progress nav tab | Progress list |
| Progress list | Taps a week row | Past-week page for that week |
| Old bookmark | Opens `/dashboard?historyWeek=<date>` | Same as opening `/progress?week=<date>` |
| Any link | Opens `/progress?week=<date>` with no saved weekly schedule for that date | Progress list |
| Any link | Opens `/progress?week=<current week>` | This week |
| Past-week page | Taps "← All weeks" | Progress list |
| Past-week page | Taps "← Older week" | Past-week page for the next older week with a weekly schedule |
| Past-week page | Taps "Newer week →" | Past-week page for the next newer past week with a weekly schedule |
| Empty Progress list | Taps the link to This week | This week |
| Progress list or past-week page | Taps another nav tab | That page |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| List · empty | The student has no past week with a weekly schedule | "No past weeks yet. Each week shows up here after it ends." and a link to This week |
| List · weeks | At least one past week has a weekly schedule | Weeks newest first, under month headings. Each row: week dates, done bar, "X of Y done" |
| List · loading | The page is fetching weeks | The app's loading state |
| Past week · middle | The week has both an older and a newer past week | Title "Week of <date>", "Past week · X of Y done", "← All weeks", "← Older week", "Newer week →", the day-by-day plan with schedule reasons, ticks shown but not pressable |
| Past week · newest | The most recent past week | As above, without "Newer week →" |
| Past week · oldest | The first week the student has | As above, without "← Older week" |
| Past week · only one | The student has exactly one past week | As above, with neither link |
| Past week · loading | The page is fetching the week | The app's loading state |

## Data cases
- One past week.
- Many weeks across several months, such as 20 or more, so month headings repeat.
- A month heading where a week crosses two months: the week sits under the month of its Monday.
- A skipped week (no weekly upload): no row, and Older/Newer step over it.
- A partial week that started midweek: the days before the start are unscheduled days.
- A week with a practice test, a practice-test review day, or a moved rest day, with its schedule reasons.
- A near-test week with two practice tests.
- A week with 0 done, a week with every activity done, and a week partly done.

## Out of scope
- Completion stats (average done, streak, planned hours, best week). The owner chose past weekly schedules only for now.
- Planned hours on each week row.
- Analytics snapshots, performance trends, practice-test results, and missed question types. Each can be its own later design.
- The admin's view of a student's Progress.
- Changing check-offs in a past week. Past weeks are read-only; check-offs do not change later weekly schedules.
- Rows for skipped weeks, and the current week. This week is one nav tap away.

## Open questions
1. How should the week list read at a glance: rows, cards, or a compact calendar-style grid of weeks?
2. How should month headings look, and should they stick to the top while scrolling?
3. How should a read-only past week signal that it is not This week, beyond its header?
4. Where do "← All weeks", "← Older week", and "Newer week →" sit on desktop and on a phone, and should a phone also support a swipe between weeks?
5. What motion moves the student from the list into a week, and between older and newer weeks?

## Directions
The owner asked for all three on 2026-10-28, as 1440 px desktop boards, and will pick one.

1. **Rows and a week page.** Month headings over one row per week. A past week opens as its own page with "Past week", Older/Newer links at the top and bottom, and a plan with no check-off boxes.
2. **Split view.** The week list sits in a column on the left, and the chosen week opens on the right. A phone falls back to Direction 1.
3. **Month cards.** One boxed card per month holds that month's week rows. The past-week page is the same as in Direction 1.
