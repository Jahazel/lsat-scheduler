# Design brief: Plan choice, free week and Account billing

Tracking ticket: #679. Spec: #680. Terms: `GLOSSARY.md` (Plans). Decisions: ADR 0007, ADR 0008.

## Job
A new student picks a plan and adds a card at the end of onboarding, so their free week starts and their first charge is planned. Later, every student can see where their plan stands, and a lapsed student always finds the way back to plan choice.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Onboarding, Review step | Confirms analytics or taps "Skip for now" | Plan choice (onboarding step 5) |
| Any link, onboarding saved but no plan yet | Opens any student page | Plan choice (onboarding step 5) |
| Plan choice | Taps a plan card | Same page; that plan is picked; dates and amount update |
| Plan choice | Taps "Add card on Stripe" | Stripe Checkout (a payment page that Stripe hosts) |
| Stripe Checkout | Adds a card | "Starting your plan…" screen |
| Stripe Checkout | Closes it or taps back | Plan choice with "You didn't add a card. Pick a plan to continue." |
| "Starting your plan…" | Stripe confirms the plan | This week (new student) or the weekly upload page (lapsed student) |
| "Starting your plan…" | Stripe has not confirmed after a long wait | Same screen with "This is taking longer than usual." and a "Try again" link |
| This week, any lapsed note | Taps "Pick a plan" | Weekly upload page showing plan choice |
| Progress, lapsed note | Taps "Pick a plan" | Weekly upload page showing plan choice |
| This week, retrying note | Taps "Update card" | Stripe Customer Portal (a page that Stripe hosts for card, plan switch, and cancel) |
| Account, Plan card | Taps "Manage plan on Stripe" | Stripe Customer Portal |
| Stripe Customer Portal | Taps "Return to DrillMap" | Account |
| Account, Plan card (lapsed) | Taps "Pick a plan" | Weekly upload page showing plan choice |
| Weekly upload page (lapsed) | Opens it from any link | Plan choice in place of the upload, with no free week |
| Account, deletion card (has a plan) | Reads the warning, deletes | Existing deletion flow |
| Landing page | Taps "Start free week" | Existing sign-up |

Admins never see plan choice, plan notes, or the Plan card.

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Plan choice · first plan | Onboarding step 5 | Two plan cards, Weekly picked at the start. Monthly has "about 31% less". The free week end date, the first charge date and amount for the picked plan. The terms: "Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time." The agreement line above the button: "By continuing, you agree your plan renews each week until you cancel." (each month for Monthly). Button "Add card on Stripe" |
| Plan choice · email already had a free week | The email used a free week in the last 12 months | Same, but "Your plan starts today. This email already had a free week." The charge date is today |
| Plan choice · lapsed | Lapsed student opens the weekly upload page | Same as above with no free week. Charge today. The page keeps the app's nav |
| Plan choice · came back without a card | Student left Stripe Checkout | Plan choice with "You didn't add a card. Pick a plan to continue." The last picked plan stays picked |
| Plan choice · going to Stripe | Student tapped the button | Button reads "Opening Stripe…" and is off |
| Plan choice · could not open Stripe | The server could not start Checkout | The app's failure toast; the picked plan stays |
| Starting your plan | Back from Stripe, waiting for Stripe to confirm | "Starting your plan…" with the app's loading motion |
| Starting your plan · slow | No confirmation after about 20 seconds | "This is taking longer than usual." and "Try again" |
| Free week ending note · Fri–Sat | Free week, Friday or Saturday of its last week | "Your free week ends Sunday. Your Weekly plan starts Monday at $10." |
| Free week ending note · Sunday | Free week, its last Sunday | "Your free week ends today. Your Weekly plan starts tomorrow at $10." |
| Free week ending note · cancelled | Free week, cancelled, Fri–Sun | "Your free week ends Sunday. You won't be charged." |
| Held weekly schedule | Monday after the free week, first charge not yet confirmed | "Your week is ready. It appears when your first payment goes through." No schedule below |
| Retrying | A renewal failed less than 7 days ago | Note on This week: "Your last payment didn't go through. Update your card by Tue, Nov 17 to keep your plan." Link "Update card" |
| Lapsed · card failed | First charge failed, or a renewal failed for 7 days | Banner on This week and Progress: "Your payment didn't go through. Pick a plan to get new weekly schedules." Button "Pick a plan". History stays readable below |
| Lapsed · ended | Cancelled, and the free week or paid period ended | Banner: "Your plan has ended. Pick a plan to get new weekly schedules." Button "Pick a plan" |
| Account Plan card · free week | Free week | Chip "Free week". Rows "Plan: Weekly · $10 a week" and "First charge: Mon, Nov 23". "Free week ends Sun, Nov 22." "Manage plan on Stripe" |
| Account Plan card · paid | Paid | Chip "Active". Rows "Plan" and "Renews: Mon, Nov 30". No sentence. "Manage plan on Stripe" |
| Account Plan card · cancelled | Free week or paid, cancelled | Chip "Cancelled". Rows "Plan" and "Ends: Sun, Nov 22". "It won't renew." "Manage plan on Stripe" |
| Account Plan card · retrying | Retrying | Yellow chip "Retrying". Rows "Plan" and "Update card by: Tue, Nov 17" (date in warning color). "Payment failed." "Manage plan on Stripe" |
| Account Plan card · lapsed | Lapsed | Yellow chip "Lapsed". Rows "Plan: No plan" and "Weekly schedules: Paused". "Pick a plan to get new weekly schedules." "Pick a plan" |
| Deletion warning | Student with a plan (free week, paid, retrying) on Account | Inside the deletion card, above the confirm field: "Your plan ends now. Unused time is not refunded." |
| Landing wording | Always | Note by every "Start free week" button: "Your first full week free. Cancel before it ends and pay nothing." FAQ "Do I need a card to start?": "Yes. You add a card when you pick a plan at the end of setup. You pay nothing until your free week ends, and you can cancel any time before then." |

## Data cases
- Free week length: onboarding ends on a Monday (13 days, ends the next week's Sunday) and on a Sunday (7 days).
- Plan picked: Weekly ($10 a week) and Monthly ($29.99 a month, "about 31% less"). Prices come from `src/lib/planPrices.ts`.
- Plan switched for the next renewal: the Account Plan card shows the current plan until the renewal.
- Held weekly schedule exists or not when the first charge fails.
- Lapsed with no weekly schedule at all (first charge failed before any paid week) and lapsed with many past weeks.
- Long dates in the notes on a 390 px phone ("Wednesday" never appears; dates use short weekday names).

## Out of scope
- Stripe code, webhooks, and the payment security review: spec #680 tickets.
- The Stripe Checkout and Customer Portal pages: Stripe hosts them. Only their colors and logo can change, in the Stripe dashboard.
- Admin student pages' plan status (spec user story 46): a later admin ticket, using the same status names.
- Payment emails: Stripe sends them.

## Open questions
1. ~~What does onboarding's right-side live preview show on step 5?~~ Answered in section 1: a preview of the Stripe page that comes next.
2. The landing page has more "pick a plan when your free week ends" lines than the ticket lists (`src/app/page.tsx` lines 87, 155, and 191). They must change too. Section 8 proposes the wording; it waits for the owner.
3. ~~Does the weekly upload confirmation for "Plan next week" in the free week's last weekend need new wording?~~ Answered in section 2: after that upload, This week keeps the free week and the note says "Your free week ends Sunday. Your Weekly plan starts Monday at $10. Your plan for next week appears then." The held weekly schedule is not previewed.

## Sections
In build order. Sections 1–3 get three variants. Sections 4–8 follow the picked patterns with no variant round (owner, 2026-11-09).

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Plan choice (onboarding step 5) | Cards + Stripe: two plan cards and three fact rows (Today $0, free week end, first charge) on the left; a preview of the Stripe page that comes next on the right | Layout: comparison cards, with the hand-off to Stripe shown before it happens | Owner, 2026-11-09: liked the Cards layout and the Timeline version's Stripe preview, asked for both together, and dropped the dashed saving bubble. "about 31% less" stays as plain blue text under the Monthly price |
| 2. This week notes (free week ending, held, retrying, lapsed) | Notice card: a card above Monday with the note's first sentence as its title, the rest below, and its button on the right (below on phones). Gray for the free week, yellow warning for retrying and lapsed. When no days show (held, lapsed after a failed first charge), a "waiting" card takes their place | Weight: a card in the week list, louder than a strip, with a button | Owner, 2026-11-09: picked Notice card over Top strip and Header panel; no reason given |
| 3. Account Plan card | Fact rows: title "Plan" with a status chip, then label-and-value rows (the plan and price, then the one date that matters next), a short sentence for what the rows do not say, and the button on the right (below on phones) | Structure: label-and-value rows like plan choice's fact rows | Owner, 2026-11-09: picked Fact rows over Row and Date tile; no reason given. Asked to drop the date from the sentence, since the date row already shows it |
| 4. Starting your plan screen | Loop: "Starting your plan…", one line on what opens next, and the app's reading bar (its sliding segment, no percent). After about 20 s: "This is taking longer than usual." and a "Try again" link. New students keep the onboarding layout with a "Next · This week" sketch on the right; lapsed students see it in the weekly upload column | No variant round (owner rule): the app's existing Loop wait motion | Built 2026-11-09; waiting for owner review |
| 5. Plan choice on the weekly upload page (lapsed) | Cards + Stripe from section 1 in the weekly upload page's grid: "Pick a plan", the plan cards, fact rows "Today: $10" and "Renews: Wed, Dec 23", the terms and button, and the Stripe sketch ("$10 today. Then $10 a week starting …") on the right. Coming back without a card adds a gray note "You didn't add a card. Pick a plan to continue." above, and keeps the last picked plan | No variant round: section 1's pattern | Built 2026-11-09; waiting for owner review |
| 6. Progress lapsed note | Notice card from section 2, above the past weeks, with the same wording as This week and a "Pick a plan" button. The past weeks stay readable | No variant round: section 2's pattern | Built 2026-11-09; waiting for owner review |
| 7. Deletion warning | Warning box at the top of the deletion card's form column, in the shape of the card's admin notice and the yellow warning tone: "Your plan ends now." over "Unused time is not refunded." Shown only when the student has a plan (free week, paid, retrying) | No variant round: section 2's warning tone in the card's own notice shape | Built 2026-11-09; waiting for owner review |
| 8. Landing page wording | Wording only, in the landing styles. Free week note: "Your first full week free. Cancel before it ends and pay nothing." Pricing lead: "Pick a plan at the end of setup. You pay nothing until your free week ends. Both plans get the same weekly schedule." FAQ card answer from the spec. FAQ "What happens after the free week?": "The plan you picked starts on its own: Weekly ($10) or Monthly ($29.99). Your weekly schedules keep coming. Cancel before the free week ends and you pay nothing." Closing signpost: "Weekly ($10) or Monthly ($29.99). Pick one at the end of setup." | No variant round: wording | Proposed 2026-11-09; waiting for owner review |

## Stress test: plan choice
Datasets in the prototype's data switch: Demo ($10 / $29.99, free week to Sun, Nov 22), Worst case (onboarding on Mon, Dec 21: a 13-day free week across the new year, with prices raised to $14.99 / $49.99), and No saving (Monthly $45, more than 4⅓ weeks of Weekly). Checked at 1440, 768, 390, 320, and 240 px (about 160% zoom on a phone). Fixed in the prototype:
- The radio circles squeezed into ovals on narrow cards: they no longer shrink.
- The saving line had a fixed height and overflowed when it wrapped: it now grows.
- The cards ran out of room below about 280 px: they stack into one column there.
- The free week date split across lines ("Jan / 3"), and the first charge split from its amount: each date and amount now stays on one line.
- With no saving, the card read "about -4% less": the saving line now shows only when Monthly saves at least 1%. **`planPriceText` in `src/lib/planPrices.ts` needs the same guard** before plan choice reads it; the landing page shows the same text.

Held up: year-boundary dates without a year, four-digit prices, the Stripe preview, the button and its "Opening Stripe…" label, tablet and desktop widths.

## Stress test: This week notes
Worst case: Monthly $49.99, a free week across the new year, a card deadline in the next year ("Mon, Jan 4"), and a retrying weekend with the "Plan next week" reminder showing too. Checked all 9 states at 1440, 768, 390, 320, and 240 px. Fixed in the prototype:
- The card deadline could split across lines ("Mon, / Jan 4"): its spaces no longer break. The build needs the same rule.

Held up: long notes at 240 px, year-boundary dates, the warning card together with the upload reminder, the empty "waiting" cards, and the "Opening Stripe…" label.

## Stress test: Account Plan card
Worst case: Monthly $49.99, the widest dates ("Thu, Feb 4", "Wed, Feb 3"), and a card deadline in the next year. Checked all 6 states at 1440, 768, 390, 320, and 240 px. Fixed in the prototype:
- At 240 px the row "Monthly · $49.99 a month" could not wrap. It covered its label and pushed the page sideways. The row now wraps after "Monthly ·"; the price and its period stay on one line. Dates never wrap.
- At 768 px the button kept its full width and pushed the card's rows past the card edge. The rows now keep their width and the button takes the rest (at least 232 px, still one line).
- The label "Update your card by" left "by" alone on a second line at 320 and 768 px. It is now "Update card by" (owner, 2026-11-09). The This week note keeps its full sentence.

Held up: the status chips (never wrap), the "Opening Stripe…" label, the paid state with no sentence, and the lapsed state's longer sentence. Outside the card, the existing landing header (315 px) and the Account email header (243 px) still need more than 240 px; both fit at 320 px.

## Stress test: sections 4–8
Worst case: prices $14.99 / $49.99, Monthly picked, and a lapsed student who restarts on Sun, Jan 31, so the monthly renewal moves to Sun, Feb 28. Checked every state at 1440, 768, 390, 320, and 240 px. Fixed in the prototype:
- The lapsed plan choice's renewal date could split across lines: it now stays on one line.
- The "You didn't add a card" note showed the free week's calendar icon: that note now has no icon.

Held up: the reading bar and the slow note at 240 px, the lapsed plan cards stacking at 240 px, the Progress note and its button, the deletion warning in the narrow form column, and the landing lines at every width. Outside these sections, two existing layouts squeeze below 320 px: the Progress week rows ("Dec 7 – Dec 13" breaks across three lines at 240 px) and the Account email header. Both fit at 320 px.

## Decisions (owner, 2026-11-09)
- One plan choice block: onboarding step 5, and the weekly upload page for a lapsed student. No `/plan` route.
- Weekly is picked at the start.
- The button is the agreement, with the agreement line above it. No checkbox. #582's lawyer review may add one.
- A "Starting your plan…" screen waits for Stripe's confirmation.
- The free week ending note has a Sunday wording and a cancelled wording. It cannot be dismissed.
- Retrying gets a This week note with a link to the Stripe Customer Portal.
- The Plan card is first on the Account page.
- The deletion warning uses the spec wording in every state with a plan.
- The This week plan note is a card above Monday (Notice card). Held and lapsed-after-a-failed-first-charge weeks show a "waiting" card in place of the days: "Your week is ready. It appears when your first payment goes through." and "Your week is saved. It appears as soon as you pick a plan."
- A cancelled free week hides the "Plan next week" reminder.
- A lapsed student never sees the "Plan next week" reminder; the lapsed card's "Pick a plan" is the only way forward.
- On phones the note stays below the header and progress, like on desktop.
- The Account Plan card uses Fact rows. Its sentence never repeats a date the rows show; the paid state has no sentence.
