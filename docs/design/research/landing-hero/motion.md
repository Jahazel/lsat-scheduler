# Motion spec: Landing redesign

Tracking ticket: #551. Decisions and history: [brief.md](brief.md). Working reference: [prototype/hero.html](prototype/hero.html) (open [prototype/index.html](prototype/index.html), add `?reduce=1` for reduced motion).

Tokens are from `src/app/globals.css`: `--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 320 ms, `--duration-reveal` 600 ms, `--ease-out-strong`, `--ease-in-out-strong`. Two values are not project tokens yet:

- `--ease-float`: `cubic-bezier(0.37, 0, 0.63, 1)` (easeInOutSine). Only the hero card bob uses it. `--ease-in-out-strong` would snap at each end of a slow loop. Add it to `globals.css` next to the other easings.
- `ease` for hover color and border changes. This is the CSS keyword, not a token.

Rules for every row:

- Animate `transform` and `opacity` only. The FAQ answer is the one exception: it animates `grid-template-rows` (0fr → 1fr), as the live `QuestionList` does.
- Hover motion runs only under `@media (hover: hover) and (pointer: fine)`.
- Reduced motion means `prefers-reduced-motion: reduce`. Each row lists what stays.
- A reveal on scroll plays once per visit. Use an `IntersectionObserver` that disconnects after the first hit.

## Page

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Top bar "How it works" and "Pricing" links, closing band signposts | Click | Page scrolls smoothly to the section (`scroll-behavior: smooth`) | Browser default | Jumps at once (`scroll-behavior: auto`) |
| Buttons ("Start free week", "Log in", top bar) | Hover | Background or border color changes, `ease` | `--duration-fast` | Same |
| Buttons | Press | Shrinks to 97%, `--ease-out-strong` | `--duration-fast` | No shrink |
| Top bar text links | Hover | Color goes to ink, `ease` | `--duration-fast` | Same |

## [01] Hero

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Headline, line, button, no-card note | Page loads | None. They must be readable at once. | — | Same |
| Floating study cards | Page loads | Each card drifts in from its side: 40 px across, 16 px down, scale 0.96 → 1, opacity 0 → 1, `--ease-out-strong`, 60 ms apart. CSS animation, so it stays smooth while the page loads. | `--duration-reveal` | Cards appear in place, no drift |
| Floating study cards | After the drift ends | Each card bobs 4 px up and back, 6 s per cycle, `--ease-float`, infinite. Each card has its own phase. The bob pauses (`animation-play-state: paused`) while the hero is off screen. | 6 s loop (no token; decorative idle loop) | Still |
| Floating study cards (tablet and desktop) | Page scroll, first 800 px | Cards rise 60–160 px at different rates and turn up to 3°. CSS scroll-driven animation (`animation-timeline: scroll(root)`, `animation-range: 0 800px`), linear. Skip it where the browser lacks `animation-timeline`. | Tied to scroll | Still |
| Floating study card (mouse or trackpad, 768 px and up) | Cursor within 200 px of the card | The card leans up to 5 px toward the cursor, lifts 4 px, loses a third of its tilt, grows to 101.5%, and its shadow deepens a little (shadow on a pseudo-element, opacity only). The pull ramps in with a smoothstep from the edge of the 200 px radius. A spring follows the cursor and settles back when it leaves: about `{ duration: 0.5, bounce: 0.2 }`. The prototype runs a small per-frame spring (stiffness 0.12, damping 0.72), so no library is needed. | Spring | No pull |
| Phone card row | Swipe | Native scroll snap. The active position dot widens, `--ease-in-out-strong`. | `--duration-base` | Dot changes at once, no slide |

## [02] How it works

Desktop and tablet pin the section. Phone stacks the four panels, with no pin and no swap.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Step text (count, title, body) | Scroll into the next quarter of the section | Old text fades out and moves 14 px up. New text fades in (`--duration-base`, 80 ms later) and rises 14 px (`--duration-slow`), `--ease-out-strong`. Scrolling back reverses the direction. Use transitions, so a fast scroll retargets instead of restarting. | `--duration-fast` out; `--duration-base` fade and `--duration-slow` rise in | Fade only, `--duration-fast`, no movement |
| Step screen | Same | Old screen fades out (`--duration-slow`) and moves 28 px up. New screen rises 28 px from 98% scale (`--duration-reveal`), `--ease-out-strong`. | `--duration-slow` and `--duration-reveal` | Fade only, `--duration-fast` |
| Color panel behind the screen | Same | Crossfade to the next panel color, `--ease-out-strong` | `--duration-reveal` | Fade, `--duration-fast` |
| Title key phrase underline | New step title arrives | 3 px underline in the panel color draws from the left (`scaleX` 0 → 1, origin left), 240 ms after the title, `--ease-out-strong` | `--duration-reveal` | Shown at once |
| Progress bar part | Scroll inside a step | The part fills with scroll position, linear | Tied to scroll | Same |
| Progress bar part | Click | Page scrolls smoothly to that step | Browser default | Jumps at once |

Screen readers get the four steps as one ordered list. The swapping panel is `aria-hidden`.

## [03] Pricing

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Heading, subtitle, each plan, cancel line | 25% of the section in view, once | Fade in and rise 16 px, `--ease-out-strong`, 80 ms apart | `--duration-reveal` | Fade only, `--duration-fast` |
| "first full week" underline | Same | Full-spectrum underline draws from the left, 360 ms after the reveal starts, `--ease-out-strong` | `--duration-reveal` | Shown at once |
| Plan card (mouse or trackpad) | Hover | Card rises 2 px. Its border darkens a little (Monthly has no border). A soft shadow fades in (pseudo-element opacity). `ease`. | `--duration-base` | No rise; border and shadow still change |

## [04] FAQ

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Title, then rows | 20% of the section in view, once | Fade in and rise 16 px, `--ease-out-strong`, 60 ms apart | `--duration-reveal` | Fade only, `--duration-fast` |
| Answer | Click the row or its +/- button | Opens with `grid-template-rows` 0fr → 1fr plus opacity, `--ease-out-strong`. Closing reverses. Transition, so a double click retargets. | `--duration-base` | Opacity only, `--duration-fast` |
| +/- button | Same | The vertical bar scales to 0 (plus becomes minus), `--ease-out-strong`. The button fills solid ink with chalk icon, `ease`. | `--duration-base` | Bar changes at once; color still changes |
| Question row (mouse or trackpad) | Hover | Question text goes to smoke; icon border darkens, `ease` | `--duration-base` | Same |

## [05] Closing band

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Ask, then the two signposts | 25% of the band in view, once | Fade in and rise 16 px, `--ease-out-strong`, 80 ms apart | `--duration-reveal` | Fade only, `--duration-fast` |
| Signpost link arrow, "Start free week" arrow (mouse or trackpad) | Hover | Arrow moves 2 px right, `ease` | `--duration-fast` | No move |
| "Log in" button (mouse or trackpad) | Hover | Border darkens, `ease` | `--duration-fast` | Same |

## Checked against the motion rules

- Gate: the landing page is seen rarely, once per visit, so marketing reveal durations (600 ms) are in budget. Hover rows are near-imperceptible (2 px moves, 120–200 ms).
- No `scale(0)`: the smallest start is 0.96 (hero cards) and 0.98 (step screen).
- No `ease-in` anywhere. Entrances use `--ease-out-strong`; the on-screen dot slide uses `--ease-in-out-strong`; hovers use `ease`; scroll-tied motion is linear.
- Feel-check during the build: play the How it works swap and the cursor spring at 2–5× duration in the DevTools animation inspector, and compare against the prototype side by side.
