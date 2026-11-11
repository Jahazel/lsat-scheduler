# Design exports

Boards exported from the Paper file "DrillMap · Design" (file `01M3Q7R5SFFG7M27V23S82A5VD`) on 2026-10-20 for spec #191.
Each board has a `.png` (Paper `export`, default settings) and a `.jsx` (Paper `get_jsx`, no node ids).

`design-system/05-foundations.png` still shows the old ease-in exit curve. Its `.jsx` shows the current one,
`--ease-out-strong` (#590).

Build screens from these files, not from Paper. The `.jsx` files are reference markup with inline styles that name the
design tokens (`var(--color-ink)`, `var(--text-small)`, …). Translate them into the app's components and Tailwind
classes; do not paste them in as-is.

When a board and a Design System board disagree, the screen board wins. Every number and name on a board is sample
data; the rules in spec #191 decide what the app shows.

## Design system (`design-system/`)

| File | Paper board | Holds |
| --- | --- | --- |
| `tokens.css` | File tokens | Colors, type scale, weights, tracking, leading, spacing, radius, opacity, breakpoints, containers (Tailwind v4 `@theme`) |
| `05-foundations` | Design System · 05 — Foundations II | Color roles, type ramp, spacing, grid, elevation, icons, motion |
| `06-component-states` | Design System · 06 — Component States | Buttons, text inputs, nav bar, page header band, progress bar, component specs |
| `07-this-week-patterns` | Design System · 07 — This week patterns | Reminder strip, day card, activity row, status icons, footer, copy rules |

`onboarding/states` also shows three controls not yet on the Design System page: the segmented switch, the checkbox,
and the drop zone's keyboard focus.

## App shell (`app-shell/`)

| File | Paper board |
| --- | --- |
| `nav-bar` | Approved · Nav bar (11a-lite) |
| `nav-bar-tab-states` | Approved · Nav bar · Tab states (7d) |
| `footer` | Approved · Footer (11a-lite) |

## This week (`this-week/`)

| File | Paper board |
| --- | --- |
| `12a-dashboard` | Dashboard (12a · Check-off, tutor feedback) |
| `12a-activity-row-states` | Dashboard · Activity row states (12a) |
| `8f-pace-states` | Dashboard · Pace states (8f) |
| `13d-upload-reminder` | Dashboard · upload reminder, Sat–Sun (13d) |
| `13d-upload-reminder-phone` | Phone · Dashboard · upload reminder (13d) |

## Weekly upload (`weekly-upload/`)

| File | Paper board |
| --- | --- |
| `13a-empty` | Weekly upload · empty (13a) |
| `13a-empty-phone` | Phone · Weekly upload · empty (13a) |
| `13b-reading-done` | Weekly upload · reading done (13b) |
| `13b-reading-done-phone` | Phone · Weekly upload · reading done (13b) |
| `13c-error-states` | Weekly upload · error states (13c) |
| `13e-no-practice-test` | Weekly upload · no practice test (13e) |
| `13f-check-the-values` | Weekly upload · check the values (13f) |

## Onboarding (`onboarding/`)

| File | Paper board |
| --- | --- |
| `step-1-goal` | Step 1 · Goal (1a.3) |
| `step-2-week` | Step 2 · Week (2a) |
| `step-2-week-short-pt-day` | Step 2 · Week: short PT day, no notice (2a) |
| `step-2-week-no-pt-day` | Step 2 · Week: no practice-test day yet (2a) |
| `step-2-week-phone` | Phone · Step 2 · Week (2a) |
| `step-3-analytics-empty` | Step 3 · Analytics: empty (3a) |
| `step-3-analytics-reading` | Step 3 · Analytics: reading (3b) |
| `step-4-review` | Step 4 · Review (4d) |
| `step-4-review-phone` | Phone · Step 4 · Review (4d) |
| `states` | Onboarding · States |

## Accounts (`accounts/`)

Exported on 2026-10-22 for #224. The states come from #222, "Pages for the owner to design in Paper".

| File | Paper board | Also covers |
| --- | --- | --- |
| `login-default` | Login · default (A) | Sessions "done": after "Sign out of all devices", the browser lands on Login |
| `login-refused` | Login · refused sign-in (A) | |
| `login-account-disabled` | Login · Account disabled (A) | |
| `login-session-ended` | Login · session ended (A) | |
| `signup-default` | Signup · default (1) | |
| `signup-box-not-ticked` | Signup · box not ticked (1) | |
| `account-default` | Account · default (2) | Sessions default; deletion with a recent sign-in |
| `account-sessions-confirm` | Account · sessions confirm (2) | |
| `account-sessions-working` | Account · sessions working (2) | |
| `account-deletion-sign-in-too-old` | Account · deletion sign-in too old (2) | |
| `account-deletion-wrong-text` | Account · deletion wrong text (2) | |
| `account-deletion-working` | Account · deletion working (2) | |
| `account-deletion-admin` | Account · deletion Admin (2) | |

## Scan limits (`scan-limits/`)

Exported on 2026-10-24 for #247. The states come from #245, "Pages for the owner to design in Paper".

When a student picks "Type them", the typing boxes show on the upload page, under the switch. The next page is the
same check page as for screenshots: the student checks the values there and confirms.

| File | Paper board | Screen ticket |
| --- | --- | --- |
| `15a-input-switch` | 15a · Weekly upload: Screenshots or Type them | #253 |
| `15b-type-them-chosen` | 15b · Weekly upload: Type them, boxes on page | #253 |
| `15d-check-typed-values` | 15d · Check your values: typed, filled | #253 |
| `15e-field-errors-and-limits` | 15e · Typed analytics: field errors and limits | #253 |
| `15f-onboarding-step-3-type-them` | 15f · Onboarding Step 3: Type them, boxes on page | #253 |
| `15g-onboarding-step-4-check-typed-values` | 15g · Onboarding Step 4: check typed values | #253 |
| `16a-scanning-off-no-practice-test` | 16a · Scanning off: weekly upload, no practice test | #254 |
| `16b-scanning-off-practice-test-week` | 16b · Scanning off: practice-test week | #254 |
| `16c-scanning-off-check-values` | 16c · Scanning off: check values, PT skipped | #254 |
| `16d-scanning-off-onboarding-step-3` | 16d · Scanning off: onboarding Step 3 | #254 |
| `17a-reading-one-at-a-time` | 17a · Weekly upload: reading one at a time | #250 |
| `17b-scan-refusals` | 17b · Scan refusals and file checks | #250, #248, #251 |

`17b-scan-refusals` holds every refusal message: daily and monthly scan limits and "We're still reading your last
screenshot." (#250), the file checks (#248), and scanning turned off during an upload (#251).

## Password sign-in (`password-sign-in/`)

Exported on 2026-10-26 for #281. The states come from #278, "Pages for the owner to design in Paper". In Paper, the
boards are on the Approved page under "Password sign-in · Chosen design". Every board name ends in "(password)".

These boards replace the `accounts/` Login and Signup boards when password sign-in ships. The `accounts/` Account
boards stay right for a Google Account.

| File | Paper board | Screen ticket |
| --- | --- | --- |
| `login-default` | Login · default (password) | #283 |
| `login-wrong-email-or-password` | Login · wrong email or password (password) | #284 |
| `login-paused` | Login · login paused (password) | #284 |
| `login-password-too-long` | Login · password too long (password) | #284 |
| `login-verify-your-email` | Login · verify your email (password) | #284 |
| `login-email-verified` | Login · email verified (password) | #283 |
| `login-password-changed` | Login · password changed (password) | #286, #287 |
| `login-email-uses-a-password` | Login · email uses a password (password) | #285 |
| `login-google-refused` | Login · Google refused (password) | #283 |
| `login-account-disabled` | Login · Account disabled (password) | #284 |
| `login-session-ended` | Login · session ended (password) | #283 |
| `signup-default` | Signup · default (password) | #283 |
| `signup-box-not-ticked` | Signup · box not ticked (password) | #283 |
| `signup-password-too-short` | Signup · password too short (password) | #283 |
| `signup-password-too-long` | Signup · password too long (password) | #283 |
| `signup-password-too-common` | Signup · password too common (password) | #283 |
| `check-your-email` | Check your email (password) | #283 |
| `verify-email-ready` | Verify my email · ready (password) | #283 |
| `verify-email-working` | Verify my email · working (password) | #283 |
| `verify-email-link-doesnt-work` | Verify my email · link doesn't work (password) | #283 |
| `forgot-password-default` | Forgot password · default (password) | #286 |
| `forgot-password-sent` | Forgot password · sent (password) | #286 |
| `set-new-password-ready` | Set a new password · ready (password) | #286 |
| `set-new-password-refused` | Set a new password · password refused (password) | #286 |
| `set-new-password-link-doesnt-work` | Set a new password · link doesn't work (password) | #286 |
| `account-change-password-default` | Account · change password · default (password) | #287 |
| `account-change-password-wrong-current` | Account · change password · wrong current password (password) | #287 |
| `account-change-password-refused` | Account · change password · new password refused (password) | #287 |
| `account-change-password-working` | Account · change password · working (password) | #287 |
| `account-deletion-default` | Account · deletion · default (password) | #287 |
| `account-deletion-wrong-password` | Account · deletion · wrong password (password) | #287 |
| `account-deletion-wrong-text` | Account · deletion · wrong confirmation text (password) | #287 |
| `account-deletion-working` | Account · deletion · working (password) | #287 |

The deletion "Admin" state has no password board. An Admin signs in with Google only, so an Admin never sees the
password form. `accounts/account-deletion-admin` stays the Admin board.

### Owner choices that change the spec's text

The owner chose these while designing on 2026-10-26. The boards win over the spec's wording.

- Login messages say "Log in", not "Sign in": "Email verified. Log in.", "Password changed. Log in with your new
  password.", "This email uses a password. Log in with your password.", "This Account can't log in.", and "Your
  session ended. Log in again."
- "Continue with Google" is a white button with a gray border. The black button is the password form's submit.
- Signup puts the Terms box just above "Create account". The box applies to the email signup only. Under the Google
  button, a line says "By continuing with Google, you agree to the Terms of Service and Privacy Policy." Pressing the
  Google button counts as agreement, so Google signup no longer waits for the box.
- Password messages, the same on Signup, "Set a new password", and "Change password":
  - Too short: "That password is too short. Use at least 8 characters."
  - Too long: "That password is too long. Try a shorter one." It gives no byte count.
  - Too common, the student's own email, or "drillmap": "This password is too common. Choose a password that's
    harder to guess."
- A wrong current password on "Change password" or on deletion: "That's not your current password. Try again."

## Study settings (`study-settings/`)

Exported 2026-11-02 for spec #464 from the Approved page, "Study settings · Chosen design". Motion rows:
`research/study-settings/motion.md`. Every board shows Direction 3 at desktop 1440, tablet 768, and phone 390; each
file name ends in `-desktop`, `-tablet`, or `-phone`.

| File | Paper board | Screen ticket |
| --- | --- | --- |
| `d3-*` | Study settings · D3 (approved direction, unsaved changes) | #466, #470 |
| `s1-clean-*` | State 1 Clean | #466, #467, #470 |
| `s2-6-save-bar-*` | States 2–4, 6 Save bar (unsaved, saving, saved, save failed) | #466 |
| `s5-field-errors-*` | State 5 Field errors | #466 |
| `s7-month-passed-*` | State 7 Test month passed | #468 |
| `s8-leave-guard-*` | State 8 Leave guard | #469 |
| `s9-loading-*` | State 9 Loading (the app's existing loading state) | #466 |
| `data-a-edges-*` | Data case A: no attempts, all days equal, 30 min, Sunday practice test, 2× time, 179 → 180 | #466, #467, #470 |
| `data-b-maximums-*` | Data case B: ten attempts, every day different, 8 h days, 1.5× time | #466, #467, #470 |

In data case A the 3 h 45 practice test sits on a 30 min Sunday. The board shows onboarding's hint and does not block
Save. Spec #464 keeps this as an open question for the tutor.

## Landing page (`landing-page/`)

Exported 2026-11-02 for spec #527 from the Approved page, "Landing page · Chosen design". Motion rows:
`research/landing-page/motion.md`. The clickable prototype with the approved motion is
`research/landing-page/prototype/index.html`; its `img/` folder holds the app-screen images the page uses. Each file
name ends in `-desktop`, `-tablet`, or `-phone`.

| File | Paper board | Screen ticket |
| --- | --- | --- |
| `d3-*` | D3 · Landing: Product first (approved direction, default state) | #528, #529, #530, #531, #532 |
| `top-bar-after-scroll-*` | Top bar after scroll: the view after a "How it works" jump | #528, #531 |
| `long-data-*` | Data case: $12.99 / $39.99 sample prices, eight questions, two open | #529, #532 |

Prices on the long-data boards are layout tests, not real prices. The three added questions are sample length only.
Reduced motion has no board; `motion.md` holds its column.

## Payments (`payments/`)

Screenshots of the approved prototype for design #679 and spec #680, taken 2026-11-09. Brief: `research/payments/brief.md`. Motion rows:
`research/payments/motion.md`. The clickable prototype, the dev-only route `/prototypes/payments`, was deleted by #711
once every payments screen ticket was built. Each file name ends in `-desktop`, `-tablet`, or `-phone`.

| File | State | Screen ticket |
| --- | --- | --- |
| `plan-choice-first-*` | Plan choice, onboarding step 5, first plan | #686 |
| `plan-choice-had-free-week-*` | Plan choice, the email already had a free week | #686 |
| `plan-choice-no-card-*` | Plan choice after closing Checkout | #686 |
| `plan-choice-stripe-failed-*` | Plan choice before Stripe fails to open (the toast is in `motion.md`) | #686 |
| `plan-choice-first-worst-*` | Data case: 13-day free week across the new year, $14.99 / $49.99 | #686 |
| `starting-waiting-*`, `starting-slow-*` | "Starting your plan…" for a new student, and after about 20 s | #686 |
| `restart-lapsed-*`, `restart-no-card-*` | Plan choice on the weekly upload page for a lapsed student | #687 |
| `starting-lapsed-waiting-*` | "Starting your plan…" in the weekly upload column | #687 |
| `this-week-free-friday-*`, `-free-sunday-*`, `-free-cancelled-*`, `-free-saved-*` | Free week ending notes | #688 |
| `this-week-held-*` | Held weekly schedule waiting card | #688 |
| `this-week-retrying-*`, `-retrying-weekend-*`, `this-week-retrying-worst-*` | Retrying note | #711 |
| `this-week-lapsed-failed-*`, `-lapsed-ended-*` | Lapsed notes on This week | #711 |
| `progress-lapsed-failed-*`, `progress-lapsed-ended-*` | Lapsed note on Progress | #711 |
| `plan-card-*` (six states), `plan-card-retrying-worst-*` | Account Plan card | #689 |
| `deletion-has-plan-*`, `deletion-no-plan-*` | Deletion warning, shown only with a plan | #690 |
| `landing-*` | Landing page wording (pricing, FAQ, closing section) | #693 |

Prices and dates are sample data; the prices module and the plan status module decide what the app shows.

## Legal pages (`legal-pages/`)

Screenshots of the approved prototype for design #746 and spec #758, taken 2026-11-10. Brief: `research/legal-pages/brief.md`. Motion rows:
`research/legal-pages/motion.md`. The clickable prototype, the dev-only route `/prototypes/legal-pages`, was deleted by #762
once every legal-pages ticket was built. Each file name starts with `desktop-`, `tablet-`, or `phone-`.

| File | State | Screen ticket |
| --- | --- | --- |
| `*-top` | Terms at the top of the page: header, tabs, section list, Calm prose | #759, #761 |
| `*-at-section` | Terms opened at `#cancelling-and-refunds`, the list marking it | #760, #761 |
| `*-reading` | Privacy Policy mid-page, the list marking the section being read | #761 |
| `tablet-list-open`, `phone-list-open` | The "On this page" bar with its list open (desktop has no bar) | #761 |
| `*-short-page` | AI disclosure with the "Related" list | #759, #762 |
| `*-signed-in` | Terms under the student header (and the tab bar on phone) | #760 |
| `*-worst-case-top` | Longer page title and tab names, a later date, and a renamed section in the list after the lawyer review (#731) | #759, #761 |
| `*-worst-case` | The arbitration section and marked gaps after the lawyer review, with two-line titles in the list | #759, #761 |

Dates and the arbitration section are sample data; the approved legal text in each page decides what the app shows.

## Landing colors and scroll motion (`landing-colors-scroll/`)

Screenshots of the approved prototype for design #773 and spec #805, taken 2026-11-11. Brief: `research/landing-colors-scroll/brief.md`. Motion rows:
`research/landing-colors-scroll/motion.md`. The clickable prototype is the dev-only route `/prototypes/landing-colors`; #813 deletes it.
Each file name ends in the window width: `-1440` (desktop), `-1100` (between 1024 and 1199 px), `-768` (tablet), or `-390` (phone).
These files replace `landing-page/` for colors and scroll motion; that folder still holds the page's copy and layout.

| File | State | Screen ticket |
| --- | --- | --- |
| `1-first-load-*` | Hero on first load: gradient backdrop, hero cards, the line grid | #810, #811 |
| `2-how-it-works-*` | How it works: the pin on desktop, the stacked list on tablet and phone | #812 |
| `3-pricing-*` | Pricing with Monthly on the gradient | #811, #813 |
| `4-faq-*` | FAQ with one answer open | #813 |
| `5-ending-*` | Start band and the dark footer | #813 |
| `6-login-*`, `7-signup-*` | Log in and Sign up with the Glow; at 1100 px the panel is hidden (#798) | #809 |

Prices are sample data; the plan prices decide what the app shows.
