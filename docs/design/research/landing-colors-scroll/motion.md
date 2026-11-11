# Motion spec: landing page colors and scroll motion

Tracking ticket: #773. Brief: [brief.md](brief.md). Prototype: `/prototypes/landing-colors` (dev only).

All values are the project's motion tokens in `src/app/globals.css`: `--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 320 ms, `--duration-reveal` 600 ms, `--ease-standard`, `--ease-out-strong`, `--ease-in-out-strong`, `--ease-float`. "Reduced motion" means the visitor's system asks for less motion; the prototype's Reduced motion button forces the same result.

`--duration-reveal` (600 ms) is over the 300 ms limit for interface motion. It is kept only for content that arrives once per visit on the landing page, where the motion is part of the message. Clicks and page changes stay at 200 ms or less.

## Paths in the flow map

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Landing page → Sign up or Log in | Start free week (hero, top bar, pricing, Start), Log in (top bar, Start, footer) | The whole page fades out. The new page scrolls to the top, fades in, and rises 8 px (4 px under 768 px). The DrillMap logo glides from its old place to its new one. Under 1200 px the top glow fades in with the form; it does not move. | Out: `--duration-fast`, `--ease-out-strong`. In and logo: `--duration-base`, `--ease-standard` | Out at once; in as a fade over `--duration-fast`; no rise, no logo glide |
| Sign up ↔ Log in | "Log in" / "Sign up" link under the form | Only the form column and the preview card fade out and back in with the 8 px rise. The panel and the glow stay still. | Same as above | Same as above, no rise |
| Sign up or Log in → landing page | DrillMap logo | The whole page fades out, glow included, then the landing page fades in at the top. The logo glides back. | Same as above | Out at once; in as a fade over `--duration-fast` |
| Logo on the landing page | Click | The page scrolls smoothly to the top. | Browser smooth scroll | Jumps at once |
| Top bar How it works / Pricing; Start signposts | Click | The page scrolls smoothly to the section and lands on its heading with the content already shown (How it works lands on step 1 of the pin; on the stacked list, step 1 is already revealed). | Browser smooth scroll | Jumps at once |
| FAQ question | Click | The answer opens by height; the icon fills Abyss Blue; one answer open at a time. Only the icon color is new. | `--duration-base`, `--ease-out-strong` | Opens at once |
| Footer legal links, Forgot password | Click | Not in this design. The prototype opens the real page; motion is unchanged from today. | — | — |

## Motion on the landing page itself

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Hero cards | First load | Each card drifts in from its side (40 px across, 16 px up, from 96% size) and fades in. Delays are uneven: 120, 180, 240, 300, 360, 420 ms (phone: two cards at 180 and 240 ms). | `--duration-reveal`, `--ease-out-strong` | Fade only |
| Hero cards | After arrival | Each card floats 4 px up and down, out of step with the others. It pauses when the hero leaves the screen. | 6 s loop, `--ease-float` | No float |
| Hero cards | Scroll, 768 px and up | Cards move up by 35% of their rise as the first 800 px scroll by. No tilt, and they no longer slide toward the top bar. | Tied to scroll | No movement |
| Hero cards | Pointer near a card, mouse only, 768 px and up | The card leans toward the pointer on a spring. | Spring | Off |
| Line grid and dots | Scroll | No motion. The lines and dots are fixed to the page. | — | — |
| How it works pin (desktop, or tablet with a window at least 800 px tall) | Scroll through about 1.25 screens | The step text leaves upward and the next arrives from below (14 px); the screen moves 28 px from 98% size; the panel shade crossfades; the key-word underline draws from the left 240 ms after the step arrives. Scrolling back reverses the direction. | Text: `--duration-base` in after 80 ms, `--duration-slow` move. Screen: `--duration-slow` fade, `--duration-reveal` move. Underline: `--duration-reveal`. All `--ease-out-strong` | Crossfades over `--duration-fast`; no movement, no underline draw |
| How it works stacked list (phone, short tablet) | Each step scrolls into view | Text and screen fade in and rise 16 px; the screen also grows from 98% size. The underline draws 360 ms later. | `--duration-reveal`, `--ease-out-strong` | Fade over `--duration-fast`; underline shown at once |
| Section headings and pricing | Scroll into view | Items fade in and rise 16 px (8 px for the pricing note) in reading order: heading, note at 80 ms, Weekly at 160 ms, Monthly at 220 ms, the cancel line at 280 ms. Monthly's gradient frame fades in 80 ms before its card. The "first full week" underline draws 360 ms after the heading. | `--duration-reveal`, `--ease-out-strong` | Fade over `--duration-fast`; underline shown at once |
| Start signposts | Scroll into view | Fade in and rise, at 80 and 140 ms. | `--duration-reveal`, `--ease-out-strong` | Fade only |
| Buttons (Start free week, plan buttons, Start buttons, dark Log in) | Press | Shrink to 97%. The color change on hover is mouse-only. | `--duration-fast`, `--ease-out-strong` | No shrink |

## Notes for the tickets

- The tablet and phone glow on Log in and Sign up must sit inside an element that takes part in page motion (`data-page-fade`), so it fades with the page. The prototype fakes this in `screen/ProtoLinks.tsx`.
- The prototype maps the real links onto its own screens, because page motion in `SiteMotion` is chosen from the real paths. Production needs no bridge.
