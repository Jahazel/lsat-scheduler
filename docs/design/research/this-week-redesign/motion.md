# Motion spec: This week redesign

One row per Flow map transition in [brief.md](brief.md), plus the States that move. Values were chosen with `animate` and checked with `review-animations`. Tokens are from `src/app/globals.css`: `--duration-fast` 120 ms, `--duration-base` 200 ms, `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`, `--ease-out-strong` `cubic-bezier(0.23, 1, 0.32, 1)`. Hover styles apply only to a mouse (`pointer-hover`).

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| This week page | Finishes Log in, sign-up with Google, onboarding, or a Stripe page (Plan choice, Update card) | The live page arrival (`page-arrive`): fades in and rises 8 px (4 px below 768 px), `--ease-standard` | `--duration-base` | Fade only, `--duration-fast` |
| Page content under the top bar | Taps a top-bar tab or phone tab (This week, Weekly upload, Progress, Study settings) | The tab presses to 0.97 (phone tab 0.96); the new page content fades in. The top bar and tab bar stay still | Press and fade: `--duration-fast`, `--ease-out-strong` press, ease-out fade | Fade only; no press scale |
| Upload due dot | Weekly upload is due | None. The dot is static | — | — |
| User menu | Taps the avatar | Grows from the avatar corner: scale 0.96 → 1 and fade, `--ease-out-strong`, a transition so a second tap reverses it. Closes at once | 160 ms (between the two tokens; the dropdown range) | Fade only |
| Account page | Taps Account in the menu | Menu closes at once; Account fades in as a tab switch | `--duration-fast` | Fade only |
| Log in page | Taps Log out | Menu closes at once; the Log in page fades in | `--duration-fast` | Fade only |
| Plan next week pill | Taps it on the weekend upload card | Pill presses to 0.97, `--ease-out-strong`; Weekly upload fades in as a tab switch | `--duration-fast` | Fade only; no press scale |
| Activity row (tick or untick) | Taps the circle, the row, or Mark done | Colour change only (circle fill, strike-through); the circle presses to 0.95. The summary bar fill moves on `scaleX`, `--ease-out-strong`. On Today, the next Up next text rises 4 px and fades in, `--ease-out-strong` | Colour and press `--duration-fast`; bar and Up next `--duration-base` | Colour only; bar jumps; Up next fades |
| Check-in save failed | A tick's save fails | The row returns to its saved state with the same colour change. The live failure toast rises 12 px and fades in, `--ease-standard`; it leaves by dropping 4 px, `--ease-out-strong`. A transition, so a new failure replaces it without a restart. On phones it sits above the tab bar | In `--duration-base`, out `--duration-fast` | Fade only, `--duration-fast` |
| Drill setup guide | Taps Set up | The live dialog: backdrop and dialog fade, the panel scales 0.96 → 1, `--ease-out-strong`. Closing reverses it faster; focus returns to Set up | Open `--duration-base`, close `--duration-fast` | Fade only |
| Drill setup guide from a drill link | Opens a `?drill=` link | The page loads, then the same dialog opens as above. A link to a drill from another week shows "That drill is not in this week." with no motion | As Set up | As Set up |
| Progress (old link) | Opens a `?historyWeek=` link | None of its own: the server redirects, and Progress loads as a page | — | — |
| Weekly upload (no schedule) | Opens This week with no weekly schedule | None of its own: the server redirects to Weekly upload | — | — |
| Onboarding (no profile) | Opens This week with no profile | None of its own: the server redirects to onboarding | — | — |
| Plan choice | Taps Pick a plan on the plan note card | Pill presses to 0.97; Plan choice loads as a page | `--duration-fast` | No press scale |
| Admin simulated date | Taps Change, picks a date | The date menu grows from Change like the user menu; This week for that date fades in as a tab switch | Menu 160 ms; fade `--duration-fast` | Fade only |
| Loading placeholder | This week's data is loading | The live `PagePlaceholder`: shows only after a 150 ms wait, fades in, a 1.6 s linear sweep band, fades out as the page fades in. CSS animation, so it stays smooth while the page loads | Fade in `--duration-base` (`--ease-standard`); out `--duration-fast` | No sweep; fades kept |
| Weekend upload card, plan note card, held-week card | The page arrives with them | None. The page fade covers their arrival | — | — |

Kept without motion on purpose: "Show N more" week notes on phones (shown at once), and the user menu closing (closes at once, so the next tap is never blocked).
