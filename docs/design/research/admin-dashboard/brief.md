# Design brief: Admin dashboard

Tracking ticket: #917

## Job
An admin opens DrillMap to do one of three jobs:

1. **Students:** see how every real student is doing, and open one student's weeks, progress, and settings. Read-only.
2. **Schedule lab:** type inputs and see the weekly schedule the engine builds, with its schedule reasons, and the weeks after it. Nothing is saved.
3. **Walkthrough:** move the admin's own student side through real dates, from a card on the student side, with the real student screens in view.

The admin area must look like the This week redesign (#881): soft white cards on a grey canvas, black pill buttons, the navy accent, the polished top bar.

## Scope
- The admin frame: the top bar with two tabs (Students, Schedule lab), the phone tab bar, the user menu. It replaces the workspace switcher.
- The student-side date: on the student side, the switch's Student segment shows the date the student side runs on. Tapping it opens the Walkthrough card. It replaces the dashed Test controls chip and its slide-over.
- Students: overview counts, then the student list with search, filters, and sorting.
- Student detail: header, This week, then three tabs (Weeks, Progress, Settings & tests). Open in lab.
- Schedule lab: inputs, the built week with its schedule reasons, Next week. Analytics can also come from screenshots the admin already has (LR, RC, and practice test sections), read by the live weekly upload and not saved.
- Walkthrough: a card on the student side, opened from the date in the switch. It has four controls: the date (simulated and real), named jumps (Next day, Saturday, Monday), a calendar folded under Pick a day, and Start over. Combined into the student side on 2026-11-15 (it was an admin tab). Cut to four controls on 2026-11-16.
- Student side: the real student pages (onboarding, This week, Weekly upload, Progress, Study settings) under the admin top bar. In the prototype they load in a frame from the running app, on the signed-in admin's own data.
- Loading placeholders for each page.

Decisions settled in planning on 2026-11-13 are in `GLOSSARY.md` (Schedule lab, Walkthrough). ADR-0009 (Skip ahead) was rejected on 2026-11-16.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Log in (admin) | Finishes | Students |
| Any admin page | Taps Students or Schedule lab | That tab |
| Students | Types in search, picks a filter or sort | The list narrows or reorders in place; the link keeps the choice |
| Students | Taps a student row | Student detail |
| Student detail | Taps ← All students | Students, with the earlier search and filter |
| Student detail | Taps Weeks, Progress, or Settings & tests | That tab, in place; the link keeps the tab |
| Student detail · Weeks | Taps a past week | That week, read-only, with ← and → to older and newer weeks |
| Student detail | Taps Open in lab | Schedule lab with this student's inputs loaded |
| Direct link `/admin/students/<id>` for a missing student | Opens it | Not found page |
| Schedule lab | Picks a preset (sample directions and edge cases) at the top of the Inputs card | Every input fills at once; the week builds. The admin can then change any input. Real students are not in this menu, so it stays short at 1,000+ students; a student comes in through Open in lab |
| Schedule lab | Changes any input | The week rebuilds in place |
| Schedule lab | Picks Screenshots under Analytics, adds screenshots | Each slot reads its file at once; when LR and RC are read, the week rebuilds from them |
| Schedule lab | Taps Next week → | The following week builds, with this week as history |
| Schedule lab | Taps ← Earlier week | The week before, as built |
| Schedule lab | Copies the page link | A link that opens the same inputs and week. Screenshot values are too large for a link: a link made after a read opens with Screenshots picked and nothing read. A link the lab cannot read opens on Steady |
| Any admin page | Taps Schedule lab again | The lab as it was left: the inputs come from the link |
| Student side | Taps the date in the switch | The Walkthrough card drops under the switch; the student screen stays in view |
| Walkthrough card | Taps ×, taps outside, presses Escape, or taps the date again | The card closes; focus returns to the date |
| Walkthrough card | Taps Next day, Saturday (Weekly upload opens), or Monday (New week starts) | The date moves; the card and the date in the switch update; the student page reloads on the new date. A week with no schedule opens Weekly upload |
| Walkthrough card | Taps Pick a day, then a later day | The calendar opens under the jumps; the date moves to that day, as above |
| Walkthrough card | Taps Start over, then Confirm start over | Onboarding on the real date; the student side has no data |
| Student side | Taps This week, Weekly upload, Progress, or Study settings | That real student page |
| Student side (any page) | Taps Back to admin | The admin tab last used |
| Standard student | Opens any `/admin` link | Their own This week |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Students · none | No onboarded students | Overview with zeros and "No students have completed onboarding yet." |
| Students · no match | Search or filter matches nobody | "No students match." and Clear filters |
| Student row badges | Plan status and analytics | Plan badge (No plan, Free week, Paid, Retrying, Lapsed) and Needs analytics |
| Detail · no schedule this week | No current weekly schedule | The live message (`adminScheduleStateMessage`), including the weekend preview messages |
| Detail · held week | Plan not paid for this week | The held-week message, not the schedule |
| Detail · no past weeks | First week | "No past weeks yet." in Weeks and Progress |
| Detail · no analytics | Skipped analytics in onboarding | Progress shows no accuracy trend; Open in lab starts from a preset |
| Lab · just opened | No inputs in the link | The Steady preset, built |
| Lab · invalid input | A value out of range (for example a goal of 20) | The field's live error; above both columns, "Showing the last week that built." and the field to fix |
| Lab · near-test week | Week within a month of the test date | The second practice test, with its reason |
| Lab · screenshots not read | Screenshots picked; LR or RC not read, or a read failed | Three slots (LR, RC, practice test sections), each Not added, Reading, read, or the live error; the last good week stays, marked out of date |
| Lab · screenshots read | LR and RC read | Each slot shows its file and what it read (27 types, 5 passage types, PT 158 · 8 missed); the week plans from these values |
| Lab · scanning off | The monthly scan limit is reached | The live upload's scanning-off note; typed values still work |
| Lab · student copied | Opened from Open in lab | "Copied from <name>, <date>" note; edits do not touch the student |
| Student side · not onboarded | After Start over, or a first visit | The real onboarding; no student tabs until it is done |
| Walkthrough · real date | No simulated date | "Real date" and the date |
| Walkthrough · simulated | A simulated date | "Simulated · real date <day>" and the date, in amber |
| Walkthrough · jumps | Card open | Next day with its date; Saturday and Monday with what happens and the date; when tomorrow is Saturday or Monday, one Next day row names it |
| Walkthrough · calendar | Pick a day open | This month, Monday first; past days and today off; later days up to 56 days ahead on; a dot on days whose week has a schedule |
| Walkthrough · moving | A move or Start over running | Controls off; "Moving…" or "Starting over…" |
| Walkthrough · failed | A move or Start over failed | "Something went wrong. Try again." |
| Confirmations | Start over | The deletion scope and Confirm start over / Cancel |
| Loading | Page data loading | A placeholder that matches each page |

## Data cases
- Students: 0, 1, 5, 60. Names missing, one letter, very long, non-Latin. Long emails.
- Plan mix: all one status, or every status.
- Study minutes per week: 3.5 h to 56 h.
- Past weeks: 0, 1, 26.
- Analytics snapshots: 0, 1, 20. Accuracy 0% to 100%. RC types: 0 to 5.
- Practice tests: none, one, several, with 0 to 10+ missed types.
- Lab weeks in the chain: 1 to 12.
- Activities per day: 0 to 6; labels up to "10 Necessary + Sufficient assumption (L2-4)".
- Date moves: 1 day to 56 days ahead.

## Out of scope
- "Needs attention" list. Needs agreed rules for "behind" and real usage. Later.
- Write actions on real students (free weeks, settings edits, account deletion). Breaks the read-only rule; touches money and data.
- Side-by-side lab comparison and saved lab cases. Later.
- Dark mode.
- Engine rule changes. The lab shows the engine as it is.

## Open questions
1. Overview counts: which numbers lead? Settled 2026-11-14: students, on a paid plan, in a free week, retrying or lapsed, needs analytics, has this week's schedule.
2. Student list sort options. Settled 2026-11-14: name, newest, plan status. Plan status puts Retrying and Lapsed first, then No plan, Free week, Paid. No paging for now; add pages of 50 when the count passes about 100.
3. Lab presets: only the three sample directions, or also edge presets (2× time, test in 3 weeks, 30 min days)? Settled 2026-11-15: both. The three sample directions, plus edge presets for 2× time, a test in 3 weeks, and 30 min days.
4. Skip ahead share done: 0%, 50%, 100% only, or a free percent? Dropped 2026-11-16 with Skip ahead (section 8). A move saves nothing, so nothing is checked off for the admin. The admin checks off tasks by hand on This week.
5. Lab screenshots and scan spending. Each read costs money and counts toward the monthly scan limit that turns scanning off for students. Recommendation: count lab reads in the same spend record, and refuse lab reads once spending passes the warning level, so lab use never turns scanning off for students. Settle before the spec.

## Sections
In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Admin frame: top bar tabs, phone tab bar, student-side bar | Switch | Navigation: one Admin / Student side control in the bar on both sides; the student side keeps only a date strip | "I like switch" (no further reason given). Changed 2026-11-15 by section 7: the Walkthrough tab is gone (two admin tabs), the date strip is gone, and on the student side the switch's Student segment shows the date and opens the Walkthrough card. The segment reads "Student" below 1280px |
| 2. Students: overview counts and list (search, filter, sort) | Ledger | Density: counts as one line of text, then a table with column sort; one Filter menu (plan status, Needs analytics, Has this week's schedule); rows below 1024px | "ledger" (no further reason given) |
| 3. Student detail: header and This week | Facts (round 2) | Facts first: a card with score, test, study time, joined, past weeks above the live This week day cards, read-only | "I like facts". Round 1 drew the week three new ways; the user asked to reuse the student's This week layout instead |
| 4. Student detail tabs: Weeks, Progress, Settings & tests | Weekly | Time: tabs (This week, Past weeks, Progress, Settings & tests) sit under the facts card. Progress lists each analytics upload by month, newest first; a row opens to the full snapshot | "I like the weekly one". Numbers (tables) and Charts (score line, bars) lost. The user moved the tabs above the week and asked every tab to share one style: a title row, month cards, and rows with the week in a 150px column |
| 5. Schedule lab: inputs and starting points | Sidebar | Layout: every input in one column beside the week, so a change and its result sit side by side. Presets (cards first, inputs folded) and Form (Study settings cards above the week) lost | "I think I'll choose the sidebar". The user found the embedded student upload page "very off", so screenshots became three compact slots inside the sidebar |
| 6. Schedule lab: the built week, reasons, and the week chain | Student view | Fidelity: the student's own read-only day cards, with day reasons on their day. One "Schedule reasons" card above the days holds the week reasons and what the week planned from. ← Earlier week and Next week → sit in the column title row. Table (one dense card, a row per day) and Chain (a strip of week tiles with minutes-per-day bars) lost | "Student view" (no further reason given) |
| 7. Walkthrough: state, date, sample, rebuild, resets | Simple (round 4) | Fewest parts: the date sits in the switch's Student segment with a ⌄; it drops a short card: the date, one status sentence, the week's days and Next week, Generate sample only when the upload is open, Skip ahead, and Rebuild or reset folded away | "I choose that one". Changed 2026-11-16 by section 8: Skip ahead and the week strip are gone; a calendar and Next day move the date Round 1 (Panel, Timeline, Next step) and round 2 (a date bar under the top bar) felt forced. Round 3 put the date in the top bar: Date pill, Split pill, and In the switch. The user leaned to In the switch but found it complicated, so round 4 cut the card down |
| 8. Walkthrough: moving the date (was Skip ahead) | Calendar (date only) | Fidelity: the student side stays the real student flow. A month calendar and "Next day →" move only the simulated date, forward, up to 8 weeks. A week with no schedule sends the admin to Weekly upload, as for a real student who missed the upload. Skip ahead (Stepper, Story, Free) lost | "The whole point of the admin thing was to experience the whole onboarding flow + weekly submitting clips for new schedules … I just wanted to have the calendar so that I can skip days." Free saved each passed week with a sample; the user found that it removed the real flow and made the student side "a different version of the schedule lab" |
| 8b. Walkthrough: how to move the date | Jumps (2026-11-16) | Named days: the card lists Next day, Saturday (Weekly upload opens), and Monday (New week starts); the calendar folds under Pick a day. Week (a one-week strip with Upload and New week tags) and Arrow (a one-tap › beside the date in the top bar) lost | "Lets use jump iteration." The user found the calendar not intuitive for skipping days or to the next week |
| 9. Loading placeholders | | | |

Build notes from the picks:
- Section 3: the detail page renders the live `ScheduleCheckInView` read-only with an admin header in its `header` slot. The redesigned `WeekHeader` (and Today card) has no admin mode: with `readOnly` it reads as next week's preview ("Your plan for next week"). The build needs an admin mode there, or keeps the header slot.
- Section 4: the live `ProgressOverview` and `PastWeekView` hardcode `/progress` links and student-voice headers. The build needs an href prop or admin variants. Every tab opens with the same title row (`PanelHeader`) and groups weeks in the same month card.
- Section 4, Settings & tests: picked **Mirror** over Rows and Compact (2026-11-15). Axis: fidelity to the student's own Study settings page. The tab shows the same groups and field shapes, each field locked (grey fill), in the shared title row and cards. Groups: Goal (current PT score, goal score, goal test month, test time), Week (a day table, the practice test day tagged, and the practice test length), Official LSAT attempts (score and month per row, newest first). User's reason: "Mirror", then "make sure it has the same overall styles as the other sections".
  - The live `StudySettingsForm` and `OfficialAttemptList` have no read-only mode. The build needs one, or a read-only view that shares their labels and helpers (`TEST_TIME_LABEL`, `practiceTestFact`, `previewWeek`, `attemptMonths`).
  - A passed goal test month shows its name with a "Passed" tag, not a blank field.
  - The live day tiles (`WeekTiles`) are left out: "30 min" overflows a tile at 1024–1440px. Check the student Study settings page for the same overflow.
  - Study time per week comes from the saved daily minutes everywhere (student list, facts card, this tab). The brief's 3.5 h data case cannot occur with a practice test day: the lowest valid week is about 5.5 h.

- Section 6: picked **Student view** (2026-11-15). The week renders the live `ScheduleCheckInView` read-only with an empty header slot; the week reasons (the ones the student reads in the This week header) sit in a separate card with a short name per reason code.
  - Next week plans like the live weekly upload (`openWeeklyUpload`): the earlier lab weeks are `priorSchedules`, a Sunday practice test sets `priorWeekPracticeTestReviewMinutes`, and a sample direction adds one new sample upload a week to the three-upload `weightedTrend`. A copied student's upload and screenshots stay the same for every week; screenshot missed types apply to week 1 only.
  - The chain keeps every built week. Earlier week does not discard later weeks. The page link keeps the built count and the shown week.
  - The chain stops at 12 weeks, or at the week that starts on or after the goal test month. The last week says why, and Next week is off.
  - An input error keeps the last built chain; Earlier and Next week still move through it.
  - The week swap slides 12px from the side of travel over 200ms; under reduced motion it fades only.
  - The live day cards hide `capacity_overage` day reasons, so a 30-minute day planned at 45 minutes shows "45 min of 30 min" with no reason in the lab. The user chose to keep it hidden (2026-11-15): the lab matches the student's day cards, and only admins read it.
- Section 8: picked **Calendar (date only)** (2026-11-16).
  - The live Test controls already keep the admin's simulated date and the real onboarding, Weekly upload and This week pages already read it (`studentSideClock`). The build swaps the Test controls date field for the calendar and Next day. Moves stay forward-only.
  - Days in weeks with a saved schedule carry a dot. Past days and days more than 56 days ahead are off.
  - A move saves nothing: no sample, no schedule, no check-offs. A week with no schedule follows the live rule and opens Weekly upload. Generate sample stays as the shortcut.
  - ADR-0009 (Skip ahead bypasses the weekly upload) is marked Rejected. The GLOSSARY.md draft still has a Skip ahead entry and names skip ahead in Walkthrough; remove both before the spec.

## Approval
- 2026-11-16: the user approved the final prototype, its motion included ("I think this is fine."). The student side runs the real onboarding and Weekly upload inside the prototype. Motion is in `motion.md`.

## Reuse
- Student detail Weeks and Progress reuse the student Progress page parts (`ProgressOverview`, `PastWeekView`), read-only.
- Student detail This week reuses the read-only This week view.
- Settings & tests shows the study settings and official attempts read-only.
- The lab calls the engine's `generateWeek` directly, so it writes nothing.
- Lab screenshots reuse the live readers (`extractScreenshot`, `extractPracticeTestScreenshot`), `reviewPracticeTest`, the live error messages, and `plannedWeekAnalytics`, in three compact slots in the sidebar. Values are used as read; there is no review step. The live extract routes refuse accounts whose own plan is not active, so the build needs an admin path that skips the plan check, keeps the spend limits, and never saves the screenshots. The prototype answers the routes with fixture rows and makes no AI calls.
