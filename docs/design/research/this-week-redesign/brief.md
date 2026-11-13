# Design brief: This week redesign

Tracking ticket: #881

## Job
A student opens This week to see what to do today, check it off, and see how the week and the road to test day are going. The page and the signed-in frame around it must look like the owner's inspiration pictures and the onboarding redesign (#852): soft white cards on a grey canvas, a sidebar, black pill buttons, the navy accent.

The data stays as today. Nothing new is stored.

## Scope
- The signed-in frame: a sidebar on tablet and desktop, the bottom tab bar on phones, the user menu, the plan note card. Every signed-in page gets the frame; the content of Progress, Study settings, Account, and Weekly upload stays as it is.
- The This week page content and its loading placeholder.
- The Admin frame: the same frame with an Admin group that holds the simulated-date controls.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Log in, sign-up with Google, Plan choice (Stripe Checkout returns) | Finishes | This week |
| Any signed-in page | Taps This week in the sidebar or tab bar | This week |
| This week | Taps Weekly upload in the sidebar (due dot when an upload is due) | Weekly upload |
| This week | Taps Progress or Study settings | That page, in the same frame |
| This week | Opens the user menu, taps Account | Account |
| This week | Opens the user menu, taps Log out | Log in page |
| This week (Sat/Sun, upload due) | Taps Plan next week on the top card | Weekly upload |
| This week | Ticks an activity | Row shows done; summary count and pace update |
| This week | Unticks an activity | Row shows not done; summary updates |
| This week | Taps Set up on a drill | Drill setup guide opens; closing it returns focus to Set up |
| Drill link (`?drill=…`) | Opens the link | This week with that drill's setup guide open |
| Old link (`?historyWeek=…`) | Opens the link | Progress, that week |
| This week (no weekly schedule, analytics needed or plan needed) | Opens the page | Weekly upload |
| This week (no profile) | Opens the page | Onboarding |
| Plan note card (lapsed) | Taps Pick a plan | Plan choice |
| Admin | Sets a simulated date in the Admin group | This week for that date |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Normal week, midweek | A weekly schedule exists, today is Mon–Fri | Today's activities first, the summary (done count, pace, score now → goal, weeks to test), week notes, the other days |
| Week started late | The schedule started after Monday | Earlier days read "Not scheduled because this weekly schedule started Tuesday." |
| Rest day today | Today is a rest day | "Rest day. Nothing planned." in the today slot, plus the next study day |
| Practice-test day today | Today holds the practice test | The practice test as today's one activity, with its time |
| Practice-test review day | Day after the practice test | The review activity |
| All done today | Every activity today is ticked | "All done" on today |
| Whole week done | Every activity this week ticked | A finished-week state in the summary |
| Behind pace | Fewer done than due so far | Pace status "Behind" |
| Weekend, upload due | Sat/Sun, next week's upload not confirmed | Top card "Next week starts Monday. Add your screenshots…" with Plan next week |
| Next-week preview | Next week saved on the weekend, this week had none | "Your plan for next week", read-only, "Check-ins open on Monday." |
| Held week | Plan not paid for this week | The held-week message, no activities |
| Free week ending | Fri–Sun of the free week | Plan note card: free week ends, charge or no charge line |
| Payment retrying | Payment failed, Stripe retrying | Plan note card with the payment problem |
| Lapsed | Plan ended | Plan note card with Pick a plan |
| Check-in save failed | Unexpected failure on tick | Failure toast with error code; the row returns to its saved state |
| Drill not in this week | `?drill=` names a drill not in the week | "That drill is not in this week." |
| Test day | Today is the goal LSAT | Countdown reads test day |
| Near-test week | The week before the test | The near-test week's lighter plan |
| Loading | Page data loading | A placeholder that matches the new layout |
| Admin | Admin account | Admin group in the sidebar with the simulated-date controls; This week report |

## Data cases
- Activities per day: 0 (rest, unscheduled), 1 (practice test), 2–6 drills.
- Long activity labels: "10 Necessary + Sufficient assumption (L2-4)", "1 Humanities + 1 Science passage (L3-4)".
- Week totals: 1 activity to 30+.
- Done counts: 0, some, all.
- Score: 120–180; goal above current. Weeks to test: 1 to 26.
- Week notes: none, one, several.
- First name and email: missing, one letter, very long, non-Latin.
- Plan notes: none, free week ending, retrying, lapsed.

## Out of scope
- A Getting started checklist. New stored state; separate ticket if wanted.
- Dark mode. Touches every page.
- New numbers such as streaks or minute trends. New stored data.
- Charts other than the Road to test day visual. Progress charts stay as they are.
- Content of Progress, Study settings, Account, and Weekly upload. They get the frame only.
- The landing-only colours (Void Eclipse, Abyss Blue, Silver Mist).

## Open questions
1. ~~Frame shape~~: settled 2026-11-12. Keep today's top bar, polished (see Sections row 1). No sidebar, so the plan note card sits at the top of the page content at every width.
2. ~~Summary and Road to test day placement~~: settled 2026-11-12. A summary card beside the title on desktop (right), under the title and notes below 1024 px (see Sections row 2).
3. ~~How the other days show~~: settled 2026-11-12. A list of day cards, the live design refined (see Sections row 4).

## Sections
In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Frame: top bar, phone tab bar, user menu, plan note card | Today's top bar, polished, with a Weekly upload tab and words only. Bar content lines up with the page column (page column widened 2026-11-12 from 880 px to the bar's 1120 px, so page edges sit under the logo and the avatar); countdown is a flag chip in the desktop top bar only (removed from the phone top bar and from the page below 1024 px on 2026-11-12, because the summary card's road line gives the time to test); the chip hides once the test date has passed, as the live countdown does; black avatar; menu shows name and email with Account and red Log out and grows from the avatar; navy upload dot; tabs press in. Phone: floating tab bar with 4 tabs (hairline icons), grey pill on the current tab. break-ui fixes (approved 2026-11-12): menu name wraps to 2 lines and email breaks anywhere; "Test day" chip is ink with chalk text; in-page countdown chip is white with a border on grey; upload dot has sr-only "analytics upload needed"; initials use grapheme clusters (live bug in src/lib/studentNav.ts initialsFor → ticket). Countdown words match src/lib/testCountdown.ts ("N days to test", "1 day to test", "Test day"). | Rounds: (1) inset sidebar / icon rail / refined top bar, (2) floating bar / title bar and tabs / app window, (3) today's bar / polished / polished + Upload tab, (4) icon sets, (5) minimal icon sets. | Wants to keep the bar students already know and only improve it. Wants it minimal: no icons in the desktop tabs. |
| 2. Week header: title, summary, week notes, Road to test day | "Quiet + score curve": today's header, refined. Left: eyebrow "Week of …", title "Your plan for this week", lead "Your plan is set. Check off as you go.", week notes with info icons. Right (320 px card, desktop): big ink done count "4 of 13 done", pace pill (grey with check when on pace or ahead, amber with warning when behind, "Week done" when all ticked), thin navy bar (fill is `transform: scaleX`, 200 ms `--ease-out-strong`, none under reduced motion); hairline; road line "N weeks to the <Month> LSAT" over a 36 px score curve (always climbs from now ring to goal dot; real scores under the ends) and one tick per week. Below 1024 px: title, notes, then the card. break-ui fixes (approved 2026-11-12): phones show 2 notes plus "Show N more"; under 7 days the road counts days ("4 days to the …"); after the test date passes the road becomes "Your <Month> LSAT has passed. Set your next test date in Study settings." with a link; a week with no activities says "Nothing planned this week." with no bar or pill; preview reads "1 activity planned" / "N activities planned". | Rounds: (1) live refined / summary strip / side column, (2) mixes: refined + column / row + road column, (3) card redesigns: quiet numbers / day dots / two tracks, (4) road for the quiet card: plain line / week road / score curve. | Keeps the header students know; wanted the old progress card calmer (it looked ugly) and the score curve, but short. Wanted the page to use the bar's width, notes before the card on small screens, and no countdown chip below desktop. |
| 3. Today: today's activities, check-in rows, Set up | "Up next": a Today card above the other days. Header "Today" + weekday and date, with "N of M done · time left". A grey panel shows the first not-done activity ("Up next", its label, minutes · section) with an outline Set up (drills only) and a black Mark done; the day's other activities sit in a list under it (the Up next one is not repeated), each with its tick circle, minutes, and a quiet text Set up on not-done drills. All ticked: the panel reads "All done for today" with "Next: <day>, <date> · N activities, time" or "Nothing else is planned this week." Rest or unscheduled today: the panel shows the reason and the next study day. Motion: ticking changes colour only, plus a 0.95 press on the circle (120 ms); the Up next text rises 4 px and fades in (200 ms, `--ease-out-strong`; fade only under reduced motion); the buttons stay mounted so focus stays on Mark done. break-ui fixes (approved 2026-11-12): row minutes rounded with `roundMinutesToTotal` (1.5× time gives part-minutes), Set up on later drills (drill links need a button to return focus to), "N activities, time" never splits, no "· Practice test" repeat on non-drill activities, Mark done's label names the activity, list minutes sit under the label below 768 px. Added 2026-11-12 (section 4 break-ui): today's day notes ("Rest day moved to …") sit under the Today header, as on the live card. | Round 1: Live, refined (today's card first) / Up next (one activity at a time) / Timeline (row height follows minutes). | Liked Up next best. Approved every break-ui recommendation, including leaving the Up next activity out of the list. |
| 4. Rest of the week | "Day cards": the live list of day cards, refined. A small "Rest of the week" heading ("Earlier this week" when today is Sunday, hidden in the next-week preview, where all 7 days show) over one white card per other day, in date order. The day header keeps the live line ("Drilling · 1 h 10 of 1 h 30"; a week with two practice tests reads "Practice test 1 of 2") with "All done" or "N of M done" (past days, or once something is ticked) on the right; the live day notes ("Rest day moved to …", "Review for last Sunday's practice test …") sit under the header. Rows match the Today list: tick circle, minutes rounded with `roundMinutesToTotal`, a quiet Set up on not-done drills (its label names the day), minutes under the label below 768 px; the preview shows read-only rows. Rest and "Not scheduled because …" days shrink to a one-line card. Motion: ticking changes colour only, plus the 0.95 press on the circle. break-ui fixes (approved 2026-11-12): day notes shown, practice tests numbered, the "(L2-4)" level range never splits (also in the Today card), Set up names the day, the heading reads "Earlier this week" on the last day. Kept as is: the 72 px Set up column at 320 px, and "35 min of 30 min" when a full section runs past the day's time. | Round 1: Day cards (live, refined) / Day tiles (a week strip; tap a tile to open a day) / Agenda (one dense card, finished past days fold to one line). | Picked the familiar list. Approved every break-ui recommendation. |
| 5. Notices: weekend upload card, next-week preview, held week | "Live, refined". Upload card (Sat/Sun, upload due): a white card shaped like the plan note card, above the week header, with an upload icon tile, "Next week starts Monday." / "Add your screenshots to build your weekly schedule." and a black pill "Plan next week" that opens Weekly upload. Next-week preview: nothing extra; the section-2 header already says "Check-ins open on Monday." Held week: the title block, then a centred white card with a clock, "Your week is ready. / It appears when your first payment goes through." (lapsed: "Your week is saved. / It appears as soon as you pick a plan."). Motion: no entrance animation (the page fade covers arrival); the pill keeps its 0.97 press (`--duration-fast`, `--ease-out-strong`) and hover colour for a mouse only. break-ui fixes (approved 2026-11-12): a held next-week preview reads "Next week · starts Monday, Nov 16" / "Your plan for next week"; in the held preview with the free-week-ending note, the clock card is dropped and the note adds "Your plan for next week appears then." (live rule); the upload card hides when the plan has ended (live `hidesUploadReminder`); under a payment-retrying note, Plan next week uses the outline pill so Update card reads first. Kept: held week + lapsed shows both the plan note and the clock card, as live does. | Round 1: Live, refined / Built in (notices inside the summary card) / Week strip (seven day boxes). | Picked the live notices, refined (no reason given). Approved every break-ui fix. |
| 6. Loading placeholder | "Live, refined": the live `PagePlaceholder` (grey shapes the width of real words, a 150 ms wait so fast loads show nothing, a 200 ms fade-in on `--ease-standard`, a 1.6 s linear sweep band, a 120 ms fade-out as the page fades in) drawn in the new layout: title block and two notes, the summary card, the Today card (Up next panel and three rows), the "Rest of the week" heading, and two day cards. The plan note card waits with the page data. Heights match the loaded normal week at 768 px and up to the pixel (score-curve boxes, three rows, a 72 px Set up column on each row); phones run 18–22 px short per card, below the first screen. Motion (`animate`): kept as live; CSS animation stays smooth while the page loads; reduced motion drops the sweep and keeps the fades. break-ui (approved 2026-11-12): the prototype's reduced-motion switch now hides the sweep, as the real setting does. Kept as is: the jump when the upload card or a plan note card arrives on top (about 160 px), the held week's one-card page, and smaller shifts on rest days, previews, and weeks with many notes, because the placeholder cannot know the data. | Round 1: Live, refined / Real words (fixed copy as real text) / Quiet cards (outlines, no sweep). | Picked the live placeholder, refined (no reason given). Approved the break-ui fix and the keep-as-is calls. |
