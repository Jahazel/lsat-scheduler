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
| Account Plan card · free week | Free week | "Weekly · $10 a week". "Free week ends Sun, Nov 22. First charge $10 on Mon, Nov 23." "Manage plan on Stripe" |
| Account Plan card · paid | Paid | "Renews Mon, Nov 30." "Manage plan on Stripe" |
| Account Plan card · cancelled | Free week or paid, cancelled | "Ends Sun, Nov 22. It won't renew." "Manage plan on Stripe" |
| Account Plan card · retrying | Retrying | "Payment failed. Update your card by Tue, Nov 17." "Manage plan on Stripe" |
| Account Plan card · lapsed | Lapsed | "No plan". "Pick a plan" |
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
1. What does onboarding's right-side live preview show on step 5? Answer in the plan choice section.
2. The landing page has more "pick a plan when your free week ends" lines than the ticket lists (`src/app/page.tsx` lines 87, 155, and 191). They must change too. Settle the wording in the landing section.
3. Does the weekly upload confirmation for "Plan next week" in the free week's last weekend need new wording? Settle it in the This week notes section.

## Sections
In build order. Sections 1–3 get three variants. Sections 4–8 follow the picked patterns with no variant round (owner, 2026-11-09).

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Plan choice (onboarding step 5) | Cards + Stripe: two plan cards and three fact rows (Today $0, free week end, first charge) on the left; a preview of the Stripe page that comes next on the right | Layout: comparison cards, with the hand-off to Stripe shown before it happens | Owner, 2026-11-09: liked the Cards layout and the Timeline version's Stripe preview, asked for both together, and dropped the dashed saving bubble. "about 31% less" stays as plain blue text under the Monthly price |
| 2. This week notes (free week ending, held, retrying, lapsed) | | | |
| 3. Account Plan card | | | |
| 4. Starting your plan screen | | | |
| 5. Plan choice on the weekly upload page (lapsed) | | | |
| 6. Progress lapsed note | | | |
| 7. Deletion warning | | | |
| 8. Landing page wording | | | |

## Stress test: plan choice
Datasets in the prototype's data switch: Demo ($10 / $29.99, free week to Sun, Nov 22), Worst case (onboarding on Mon, Dec 21: a 13-day free week across the new year, with prices raised to $14.99 / $49.99), and No saving (Monthly $45, more than 4⅓ weeks of Weekly). Checked at 1440, 768, 390, 320, and 240 px (about 160% zoom on a phone). Fixed in the prototype:
- The radio circles squeezed into ovals on narrow cards: they no longer shrink.
- The saving line had a fixed height and overflowed when it wrapped: it now grows.
- The cards ran out of room below about 280 px: they stack into one column there.
- The free week date split across lines ("Jan / 3"), and the first charge split from its amount: each date and amount now stays on one line.
- With no saving, the card read "about -4% less": the saving line now shows only when Monthly saves at least 1%. **`planPriceText` in `src/lib/planPrices.ts` needs the same guard** before plan choice reads it; the landing page shows the same text.

Held up: year-boundary dates without a year, four-digit prices, the Stripe preview, the button and its "Opening Stripe…" label, tablet and desktop widths.

## Decisions (owner, 2026-11-09)
- One plan choice block: onboarding step 5, and the weekly upload page for a lapsed student. No `/plan` route.
- Weekly is picked at the start.
- The button is the agreement, with the agreement line above it. No checkbox. #582's lawyer review may add one.
- A "Starting your plan…" screen waits for Stripe's confirmation.
- The free week ending note has a Sunday wording and a cancelled wording. It cannot be dismissed.
- Retrying gets a This week note with a link to the Stripe Customer Portal.
- The Plan card is first on the Account page.
- The deletion warning uses the spec wording in every state with a plan.
