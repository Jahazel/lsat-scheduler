# Motion spec: Progress

The owner approved this motion in the prototype on 2026-10-28 (`prototype/index.html`).

Durations are the design-system tokens: fast 120 ms, base 200 ms, slow 320 ms. Easings: standard `cubic-bezier(0.2, 0, 0, 1)`, exit `cubic-bezier(0.4, 0, 1, 1)`. Reduced motion follows the design system: drop movement, keep 120 ms fades.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Page content (below the nav bar) | Progress nav tab, from any student page | None. The page appears, the same as the other nav tabs today. | — | Same |
| Page content | Week row on the list → past-week page | Fade through: the list fades out, then the week fades in. The page starts at the top. Focus moves to the page title. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same scroll and focus. |
| Page content | "← Older week" (pill or bottom link) → older past week | Shared axis: the page fades out while it moves 8 px to the right, then the older week fades in from 8 px on the left. The nav bar stays still. The page starts at the top. Focus moves to the page title. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same scroll and focus. |
| Page content | "Newer week →" (pill or bottom link) → newer past week | Shared axis, mirrored: out to the left, in from 8 px on the right. The nav bar stays still. The page starts at the top. Focus moves to the page title. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same scroll and focus. |
| Page content | "← All weeks" → list | Fade through. The list returns to the scroll spot the student left. Focus returns to the row of the week the student came from. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same scroll and focus. |
| Page content | Browser Back or Forward between these pages | The same motion as the link that leads to the same page. | As above | As above |
| Page content | A second click while a transition runs | The running transition continues from where it is, toward the newest target. It never jumps back to full opacity. A second click on the same link adds no history entry. | — | Same |
| Page content | Old bookmark `/dashboard?historyWeek=<date>`, or `/progress?week=<date>` with no weekly schedule, or `/progress?week=<current week>` | None. The redirect happens before the page draws. | — | Same |
| Page content | Taps "Go to This week →" on the empty list | None, the same as the nav tab. | — | Same |
| Week row (list) | Pointer hover, on devices that can hover | Background steps to vellum. | fast, standard easing | Same (color only) |
| Week row (list) | Press | Background steps to vellum-line. | fast, standard easing | Same (color only) |
| Older / Newer pill | Pointer hover | Background steps to vellum. | fast, standard easing | Same (color only) |
| Loading state (list and past week) | The page is fetching | The app's shared loading skeleton (`src/app/loading.tsx`), with its existing pulse. | Existing | Existing |

The page title takes focus with no visible ring, which is the usual pattern for focus the page moves. The next Tab stop shows the ring.
