# Design brief: Study settings

Tracking ticket: #449

## Job
A student opens Study settings to change what onboarding asked them: goal score, goal test month, test time (accommodation), official LSAT attempts, daily capacity for each day, and the preferred practice-test day. The changes apply to the next weekly schedule created.

The page is one page with two sections, Goal and Week. It uses the same controls as onboarding's Goal and Week steps, not a step-by-step wizard. The current score shows read-only; only the weekly upload changes it.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Any student page | Taps the "Study settings" nav tab ("Settings" on phone) | Study settings |
| Study settings · no unsaved changes | Taps another nav tab | That page |
| Study settings · unsaved changes | Taps another nav tab | "Leave without saving?" dialog |
| "Leave without saving?" dialog | Taps "Leave" | That page; the edits are lost |
| "Leave without saving?" dialog | Taps "Stay" | Study settings with the edits kept |
| Study settings · unsaved changes | Closes or reloads the browser tab | The browser's own leave prompt |
| Study settings | Changes any field | Same page; "Save changes" appears |
| Study settings · unsaved changes | Presses "Save changes", all fields valid | Same page; confirmation "Saved. Changes apply to your next weekly schedule." Save button hides |
| Study settings · unsaved changes | Presses "Save changes", a field is invalid | Same page; errors under each field; page moves to the first error |
| Study settings · unsaved changes | Presses "Save changes", save fails | Same page; failure toast; every edit kept |
| Study settings | Taps "Add attempt" | A new empty attempt row, focus on its score |
| Study settings | Taps an attempt's remove button | The row is removed (saved on "Save changes") |
| Any link, signed out | Opens `/settings` | Log in page |
| Any link, onboarding not finished | Opens `/settings` | Onboarding |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Clean | The page has loaded, or a save just finished | All saved values. Current score read-only with "Updates with each weekly upload". No Save button. The note "Changes apply to your next weekly schedule." |
| Unsaved changes | The student changed any field | "Save changes" button (sticky at the bottom on phone) with the note "Changes apply to your next weekly schedule." |
| Saving | The student pressed "Save changes" | Button reads "Saving…" and is disabled; fields stay visible |
| Saved | The save succeeded | A short confirmation: "Saved. Changes apply to your next weekly schedule." Page returns to Clean |
| Field errors | Save pressed with invalid input | The message under each invalid field; page moves to the first one. Cases: goal score not above current score; daily capacity under 30 min or over 8 h; attempt missing a score or month |
| Save failed | Network or server error on save | The app's failure toast. Every edit stays on the page |
| Test month passed | The saved goal test month is no longer offered | A notice at the top: "Your test month has passed. Choose a new one." The test-month field is empty and highlighted. Save is blocked until a month is chosen |
| Leave guard | Unsaved changes and the student taps another nav tab | "Leave without saving?" dialog with "Leave" and "Stay" |
| Loading | The page is fetching the student's settings | The app's loading state |

## Data cases
- Official LSAT attempts: none ("No official attempts yet" and "Add attempt"); one; several; ten, the most allowed ("Add attempt" goes away, note "You can record up to 10 attempts").
- Daily capacity: all days equal (the "All days" row); every day different; the minimum 30 min; the maximum 8 h on several days (weekly total at its largest).
- Preferred practice-test day: each day of the week, including Sunday (its practice-test review day falls in the next weekly schedule).
- Test time: standard, 1.5x, 2x. The practice-test length note under the Week section changes with it.
- Current score near the top (179), so the goal score can take only one value (180).
- Goal test month: the nearest offered month; the last offered month; a passed month (Test month passed state).

## Out of scope
- Email, password, and account deletion: they stay on the Account page.
- Rebuilding this week after a change: changes apply to the next weekly schedule created, by the existing rule.
- Showing a student's study settings to the admin.
- Links into Study settings from other screens, such as "Change your daily capacity" on This week. The nav tab is the only way in for now.
- Editing the current score: only the weekly upload changes it.

## Open questions
1. Official LSAT attempts: onboarding uses a "None yet / I've taken it" switch above the rows. The owner chose "No official attempts yet" with "Add attempt" for this page. Which list pattern reads best for add, edit, and remove on a settings page?
2. Save bar: where does "Save changes" sit at desktop width, and how does it stay reachable on a long page (sticky footer bar, top-right button, or end of page)?
3. Section layout at desktop: one centered column, a two-column page (section label left, fields right), or side navigation between Goal and Week?
4. Read-only current score: how do settings pages show a value the user cannot edit here, and point to where it changes?
5. Saved confirmation: an inline message near the button, a toast, or both? How long does it stay?
6. Leave guard: what wording and dialog pattern do apps use for unsaved changes?
7. Week preview: where does the live week preview sit next to the daily-capacity table at desktop and on phone?

## Directions
All three use the patterns the owner liked on 2026-11-01: attempt rows with a remove icon and "Add attempt" (1A, with the 1C empty state), a save bar that appears at the bottom after a change (2A), one column of Goal and Week sections (3A), a plain-text current score with "Updates with each weekly upload" (4A), an inline "Saved" message in the bar (5B), a "Leave without saving?" dialog (6A), and a live week preview at `lg` and wider (7A). Boards show the unsaved-changes state (goal score 165 → 168, Friday 1 h → 1 h 30). Paper page: Explorations, top row.

| Direction | Layout | Save bar | Phone fit | Board |
| --- | --- | --- | --- | --- |
| 1 · Stacked cards | Page header band, then Goal and Week cards in a 672 px column; a compact preview card (day bars) in a right rail. | Dark bar floating at the window bottom. | Cards stack; rail hidden; bar becomes a full-width strip. | `directions/d1-stacked-cards.png` |
| 2 · Split with live preview | One open sheet, no cards; the right half is onboarding's live preview window, reused as-is. | White full-width strip pinned to the window bottom. | Preview half dropped; same strip. Lowest reshaping cost. | `directions/d2-split-live-preview.png` |
| 3 · Goal strip + week workspace | Goal fields in one row of four; the preview sits inside the Week card next to the capacity table. Bends 7A: the preview is beside Week, not beside the whole page. | Content-width dark bar with a white Save button (Direction 1's style). | Goal row wraps 2 × 2; preview dropped; bar becomes a strip. | `directions/d3-desktop-1440.png` |

Owner's pick (2026-11-01): **Direction 3**, with Direction 1's save-bar style (dark bar, white button) at Direction 3's content width.

## Prototype
The owner approved the Direction 3 boards at 1440, 768, and 390 on 2026-11-01 (`directions/d3-desktop-1440.png`, `directions/d3-tablet-768.png`, `directions/d3-phone-390.png`).

A throwaway clickable prototype is at `prototype/index.html`. Open the file in a browser. It has no build step and no saved data. Its control bar switches the width, the motion mode (with a ×5 slow-motion switch), the data case, and whether the next save works or fails. Reload shows the loading state. The owner approved its flow and motion on 2026-11-01. The motion rows are in `motion.md`.

## State boards
The owner approved every state and data case board on 2026-11-02. The boards are in Paper on the Approved page, under the header "Study settings · Chosen design", at desktop 1440, tablet 768, and phone 390. The top row holds the approved Direction 3 boards. The row below holds the state and data case boards. Exports are in `docs/design/study-settings/`, one `.png` and one `.jsx` per board. The approved Direction 3 boards are `d3-{desktop,tablet,phone}`.

| Brief state or data case | Boards |
| --- | --- |
| Clean | `../../study-settings/s1-clean-{desktop,tablet,phone}.png` |
| Unsaved changes, Saving, Saved, Save failed | `../../study-settings/s2-6-save-bar-{desktop,tablet,phone}.png`. Only the bottom of the page changes, so each board shows the four bars and the toast |
| Field errors | `../../study-settings/s5-field-errors-{desktop,tablet,phone}.png` |
| Test month passed | `../../study-settings/s7-month-passed-{desktop,tablet,phone}.png` |
| Leave guard | `../../study-settings/s8-leave-guard-{desktop,tablet,phone}.png`, cropped to one window |
| Loading | `../../study-settings/s9-loading-{desktop,tablet,phone}.png`, the app's existing `src/app/loading.tsx` |
| No attempts; all days equal; the 30 min minimum; Sunday practice test; 2× time; current 179 with goal 180; the last offered month | `../../study-settings/data-a-edges-{desktop,tablet,phone}.png` |
| Ten attempts; every day different; 8 h on several days; 1.5× time; the nearest offered month | `../../study-settings/data-b-maximums-{desktop,tablet,phone}.png` |
| One attempt, several attempts, standard time, Saturday practice test | Covered by Clean (two attempts, standard time, Saturday) |

Decisions made while building the states:
- A passed test month shows no "days to test" countdown in the nav, as the app does (`src/lib/testCountdown.ts`). The prototype now does this too.
- The save-failed toast uses the app's real copy and Close control (`src/components/FailureNotice.tsx`), not new copy.
- On the phone, the save bar sits 8 px above the floating tab bar, inset 12 px.
- With ten attempts, "Add attempt" goes away and the hint "You can record up to 10 attempts." takes its place.

Open point from the data cases: in data case A, the 3 h 45 practice test does not fit Sunday's 30 min. Onboarding only shows the hint "Pick a day with that much time." and does not block this. The boards follow the app and do not block it either.

Resolved by the tutor (2026-11-09, #504): the app now blocks a practice-test day shorter than the practice test. The hint is gone; the save refuses with a message under that day.

## Handoff
Spec #464 holds this open point under Further Notes, as a question for the tutor. Screen tickets: #465 (shared controls), #466 (page and save bar), #467 (official LSAT attempts), #468 (test month passed), #469 (leave guard), #470 (live week preview). They run in that order.
