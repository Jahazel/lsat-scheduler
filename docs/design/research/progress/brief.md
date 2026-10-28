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
The owner asked for all three on 2026-10-28, as 1440 px desktop boards. **The owner picked Direction 3 on 2026-10-28.** Its past-week page is the Direction 1 past-week page.

1. **Rows and a week page.** Month headings over one row per week. A past week opens as its own page with "Past week", Older/Newer links at the top and bottom, and a plan with no check-off boxes.
2. **Split view.** The week list sits in a column on the left, and the chosen week opens on the right. A phone falls back to Direction 1.
3. **Month cards.** One boxed card per month holds that month's week rows. The past-week page is the same as in Direction 1.

## Prototype
The owner approved the Direction 3 boards at 1440, 768, and 390 on 2026-10-28.

A throwaway clickable prototype is at `prototype/index.html`. Open the file in a browser. It has no build step and no saved data. Its control bar switches the width, the data set, and the motion mode, and has a ×5 slow-motion switch. It also opens the three deep links from the flow map.

Motion in the prototype:
- List row to past week, and "← All weeks" back to the list: fade through. The old page fades out in 120 ms (fast, exit easing). The new page fades in in 200 ms (base, standard easing).
- "← Older week" and "Newer week →": the same timing with an 8 px slide toward the link's side. The nav bar stays still.
- Nav tabs: no animation, the same as the other tabs today.
- Reduced motion: a 120 ms fade only, with no movement.
- After a row, Older, or Newer, the page scrolls to the top and focus moves to the page title. After "← All weeks", the list returns to the saved scroll spot and focus returns to the row the student left.

Impeccable motion review, 2026-10-28 (two isolated reviewers):
- Fixed: an interrupted transition jumped back to full opacity. It now continues from where it is.
- Fixed: a fast double click on Older added a second history entry, so one Back press did nothing.
- Fixed: the page faded to white. It now fades to the page's gray background.
- Fixed: the row press color used 200 ms and felt slower than the hover. Both use 120 ms. Hover color applies only on devices that can hover.
- Kept: the page title takes focus with no ring. This is the usual pattern for focus that the page moves; the next Tab stop shows a ring.
- Kept: the horizontal slide for Older and Newer. The two links sit left and right, so the slide follows them.
- Detector: two findings, both false positives. The Geist font is the design-system font. The cramped padding is on the prototype's control bar, not on Progress.

Change from the boards: week rows and titles always use the week's Monday to Sunday dates. The board's first-week row read "Sep 9 – 13"; the prototype reads "Sep 7 – 13". Step 5 checks this against the live app.
