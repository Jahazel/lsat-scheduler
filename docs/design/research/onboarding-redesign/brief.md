# Design brief: Onboarding redesign

Tracking ticket: #852

## Job
A new student tells DrillMap their target, their week, and their 7Sage analytics, then sees the week DrillMap made for them. Onboarding must feel as current as the landing page, and Analytics plus Review must feel lighter than they do today.

The data stays the same as today (`src/lib/onboardingWizard.ts`). The grouping, order, and look are open.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Sign-up with Google | Finishes Google sign-in | Onboarding, first question |
| This week, Progress, Study settings, Account, Weekly upload | Opens the page with no profile yet | Onboarding, first question |
| Any onboarding step | Taps Continue (answers valid) | Next step, slides forward |
| Any step after the first | Taps Back | Previous step, slides back, answers kept |
| Any step | Reloads the page | Onboarding, first question, answers lost (#853) |
| Any step | Taps Log out | Log in page |
| Analytics | Adds both screenshots, taps Continue | Review |
| Analytics | Picks "Type them", fills values, taps Continue | Review (typed) |
| Analytics | Taps Skip for now | Profile saves without analytics → Week reveal |
| Review | Ticks both statements, taps Confirm | Profile saves → Week reveal |
| Week reveal (student) | Taps Choose your plan | Plan choice |
| Week reveal (admin) | Taps Go to This week | This week |
| Week reveal | Reloads the page | Plan choice (student) or This week (admin) |
| Plan choice | Picks a plan, taps the pay button | Stripe Checkout → This week |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Empty first step | First arrival | Greeting by first name, step count, empty fields |
| Field error | A field is left with a bad value | The message under the field, e.g. "Your goal must be higher than your current score, 150." |
| Short practice-test day | The picked day holds less than a full practice test | "Sat needs at least 2 h 30 for a full practice test. Add time or pick another day." |
| No practice-test day | No day picked | Continue blocked with its reason |
| Scanning off | Screenshot reading is switched off | Typed values only, with the scanning-off note |
| Screenshot rejected | Wrong file type or over 4 MB (`MAX_SCREENSHOT_MB`) | The rejection message on that drop zone |
| Reading | A screenshot is being read | The reading bar (Loop) on that section |
| Read failed | Cannot read, timed out, or refused | "not read" with a retry or replace path |
| Review, screenshots | Both screenshots read | Read values, edits marked "was …", priority flags, two statements to tick |
| Review, typed | Student typed values | Typed values, the typed statements |
| Saving | Skip or Confirm pressed | "Saving your plan. This takes a few seconds." |
| Save failed | Unexpected failure | Failure toast with error code; answers kept |
| Save refused | Planned refusal, e.g. a limit | The refusal message; answers kept |
| Week reveal, with drills | Saved with analytics | Target, week, Monday's drills, one button |
| Week reveal, without drills | Saved after Skip for now | Target, week, "Drills fill in after you add your analytics." |
| Admin | Admin account | No Plan choice; the reveal button reads "Go to This week" |

## Data cases
- First name: missing ("there"), one letter, very long, non-Latin.
- Scores: 120–180; the goal must be higher than the current score.
- Goal test date: the next six LSAT months.
- Test time: Standard, 1.5× time, 2× time. A full practice test takes 2 h 30 at standard time.
- Official LSAT attempts: none, one, many (5+).
- Week: every day the same; uneven days; one long day; the practice-test day short or missing.
- LR analytics: 5+ question types with percentages, plus priority tiers (Highest, Medium, Low); some types missed by the read.
- RC analytics: five passage types (Law, Comparative, Science, Humanities, Art).
- Monday's drills: none (skipped), a few, many.

## Out of scope
- Draft saving across reloads (#853). It is a stored-data decision.
- Any change to the data onboarding asks for. Changes go to the tutor first.
- Plan choice's layout and Stripe Checkout. Plan choice gets the new style only.
- How screenshots are read.

## Open questions
1. Which grouping of questions wins (per section, from the variants).
2. ~~The shape of the step count.~~ Answered in section 1: a ring with "Step 2 of 4 · Week" in the top bar; a check mark with "Done · Week reveal" on the Week reveal.
3. ~~The shape of the desktop preview.~~ Answered in section 4: Road to test day.

## Sections
In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Frame: top bar, step count, layout, step motion | Canvas setup, step count in the top bar | Where progress lives (after a riff on Canvas: band, eyebrow, top bar, pill) | One bar holds the logo and "Step 2 of 4 · Week", so the question column stays calm. Back and Continue stay pinned at the column's bottom; the preview is a soft card on grey. |
| 2. Goal questions | Refined form (today's layout, improved) | None: the owner kept the prototype's plain form over Sentence, Score track, and Then and next | The plain form already reads well. Added: "+15 from your current score" under the goal, "About 7 weeks away" under the date, a visible Test time label, past LSATs below a divider with short month names ("Nov 2025") so they fit at 320 px, 3-digit score boxes. |
| 3. Week questions | Stepper table (combines Refined table and Steppers) | How a time is set (round 1: Steppers, Bars, Weekdays and weekend; then Refined table; then this combination) | Keeps the familiar Day · Study time · Practice test table with an "All · Apply" row, the practice-test row tinted and its error on that row; each day is a − / + stepper (15 min, 30 min to 8 h) whose value is also a dropdown for big jumps. `break-ui` ran with the schema limits (30 min to 8 h, the widest label "7 h 45", a too-short practice-test day at 2× time, no practice-test day) at 320 to 1440 px. Fixed: the double rule above Weekly total, and the no-day reason now shows in grey, not red, before the student acts. |
| 4. Desktop preview | Road to test day | What the preview shows (Refined existing mini This week, Plan so far checklist, Road to test day, Focus on one answer) | It shows the whole road: weeks to the test date, a score line from now to the goal, and Week 1 filling in below. Kept without a "not a prediction" note. `break-ui` ran with worst and empty data at 1024 and 1440 px; fixed a wrapping label and a stray tick before a date is picked. Hidden below 1024 px, as today. |
| 5. Analytics | Refined existing, with the Quiet drop box and the Badge read state | Layout (Refined existing, Side by side, One at a time, Compact list); then the upload box (today's box, Specimen, Form field, Paste panel, Quiet drop, Quiet one area, Quiet side by side); then the read state (today's, Badge, Preview, What we found) | Keeps today's order: Screenshots / Type them switch, two uploads, size limits, privacy note. Today's dashed grey box looked AI-generated; the owner chose a light drop area (white, thin faint dashes, line icon, centered title and hint) from an inspiration screenshot. A read box shows a soft green check circle, "9 question types found", and one pill with the file name and Replace. "Where to find it" folds into one line that opens; the list of read values moves to Review. `break-ui` ran: long macOS file names keep their end ("Scree… Reasoning.png"), wrong type and 5.1 MB files show today's messages, an unreadable screenshot gets a red ! circle with Try again and Choose a sharper screenshot, and the top bar keeps Log out on one line at 320 px. |
| 6. Review | Mirror bars | How values are shown and edited (Refined existing list, Section cards with Edit, Mirror bars) | Each value sits over a bar in the screenshot's order, so comparing with 7Sage is quick by eye. A changed value shows "Was 64%" and a grey bar for the old value; priority flags are switches; Reading Comprehension marks the lowest passage type "Goes first". Show screenshot opens the screenshot inline; the Road to test day card stays on the right. The two statements keep today's words. The "Type them" path uses the same rows: five empty passage types plus Add a question type, then Review with the typed statements. `break-ui` ran with nine long question types, 0% and 100%, a 105 typo, an added type, a 100→0 change, and every flag on, at 320 to 1440 px; fixed the faint old-value bar and an early "Fix 5 values" note on the empty typed form. |
| 7. Week reveal | Refined existing | How the week is shown (Refined existing This week pieces, Stat cards dashboard, Agenda day list, Monday first) | The owner liked the refined existing look: it reuses the This week page the student opens next. The heading, then "150 → 165" with "+15 to go" under the test month and weeks away, then seven day tiles (Monday outlined in ink, the practice-test day in accent with a PT bar), then Monday's drills as rows with minutes and the reason (accuracy or priority). One button: "Choose your plan", or "Go to This week" for an admin. After Skip for now, the drills area reads "Drills fill in after you add your analytics." The Road to test day card stays on the right without its Monday line. First-visit entrance: parts rise 8 px in one wave (0, 70, 120, 160 ms) and the bars grow from zero; reduced motion fades only. `break-ui` ran with 120 → 180, February 2027 at 2× time, a 43 h 45 week with 8 h days and a 30 min day, a Wednesday practice test, eight long drill names, and no drills, at 320 to 1440 px; fixed day-tile times that did not fit below 640 px (they now read "7h45", "30m") and the right card repeating all drill names. |
| 8. Plan choice style | Refined existing | Look only, layout fixed by #712 (Refined existing, Tinted, Quiet type, Raised cards) | The owner kept today's look. Changes: the mono "STEP 5 OF 5 · PLAN" and "NEXT · ON STRIPE" labels go; the top bar shows a check mark with "Last step · Plan"; the Stripe sketch sits in the same soft white card on grey as Road to test day, with a pill "Add card"; the consent line, Add card on Stripe, and its caption sit in the pinned bottom bar like Continue on the steps. Cards, fact rows, and words stay as #712 has them. `break-ui` ran with fake raised prices ($49.99 a week, $149.99 a month), a free week across the new year, Had a free week, and No card added, at 320 × 568 to 1440 px: nothing overflowed. On screens under 700 px high the pinned bar covered the fact rows, so there the bar sits at the page end (owner chose this over always pinned or button-only). |
