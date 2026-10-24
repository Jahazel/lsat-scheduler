# Design exports

Boards exported from the Paper file "DrillMap · Design" (file `01M3Q7R5SFFG7M27V23S82A5VD`) on 2026-10-20 for spec #191.
Each board has a `.png` (Paper `export`, default settings) and a `.jsx` (Paper `get_jsx`, no node ids).

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
