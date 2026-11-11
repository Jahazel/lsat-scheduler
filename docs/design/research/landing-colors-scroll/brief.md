# Design brief: landing page colors and scroll motion

Tracking ticket: #773. Spec: #805. Tickets: #809, #810, #811, #812, #813. Screenshots: `docs/design/landing-colors-scroll/`.

## Job

A visitor scrolls the landing page to learn what DrillMap does and what it costs, then starts a free week. The page must use the new three-color set and scroll smoothly from top to bottom, with no part that feels stuck or that jumps.

## Color set (owner, 2026-11-10)

| Name | Hex | Role on the landing page |
| --- | --- | --- |
| Void Eclipse | `#0B0B0B` | Text, buttons, the dark end of the gradient |
| Abyss Blue | `#2B3B79` | Accent marks, the glow behind the product screen, step panels, key underlines |
| Silver Mist | `#E4E4E4` | Borders, frames, and the light end of the gradient |

- The page stays light, like the current landing page. (Owner, 2026-11-10: replaces the earlier dark-hero choice after seeing the dark versions.)
- The gradient (Void Eclipse at the top, Abyss Blue in the middle, Silver Mist at the bottom) replaces the violet-pink-amber glow.
- Violet, pink, and amber leave the landing page. The four How it works panels become shades of the blue-to-silver gradient.
- Log in and Sign up use the same gradient in place of their violet-pink-amber glow. The signed-in app does not change.
- Card style follows the owner's dashboard reference: soft light-gray frames, thin borders, small rounded corners. It applies to the product screen frames and the pricing cards.
- Abyss Blue stays on the landing page, Log in, and Sign up. The app-wide Accent (`#123A94`) does not change in this round.

## Scroll problems to fix (owner, 2026-11-10)

1. **How it works pin.** The panel stays fixed for about 2.5 screen heights while four steps swap in place. It feels as if the page stops scrolling. Replace it with normal scrolling.
2. **Hero cards.** The six sample cards rise and tilt with scroll and slide toward the top bar. They leave the hero in an odd way.
3. **Line grid.** The dashed guide lines change weight and stop at each section edge. The hero has dots and no lines. The grid must read as one even set of lines from the hero to the footer.

A desktop scroll recording on 2026-11-10 showed no frame over 20 ms. The problems are in how the motion looks, not in speed.

## Flow map

| From | User action | To |
| --- | --- | --- |
| Direct visit, search result, or shared link | Opens `/` | Landing page, top |
| Logo in the signed-out top bar or the site header | Click | Landing page, top |
| Top bar | How it works / Pricing | Same page, scrolls to that section |
| Hero or Pricing or Start | Start free week | `/signup` |
| Top bar or Start | Log in | `/login` |
| How it works | Scroll | Each step comes into view in order |
| FAQ | Click a question | The answer opens; one at a time |
| Start | Pricing / How it works signposts | Same page, scrolls to that section |
| Footer | Legal links | `/legal/*` pages |

## States

| State | When it happens | What it must show |
| --- | --- | --- |
| First load | Visitor opens `/` | Hero on the gradient; hero cards arrive once |
| Mid scroll | Visitor scrolls down at any speed | No blank section, no stuck panel, grid lines continuous |
| Jump to section | Top bar or signpost link | Lands on the section heading with the content already shown |
| Reduced motion | Visitor's system asks for less motion | Content shows with fades only; no movement tied to scroll |
| Phone | Width under 768 px | Hero cards in a swipe row; steps stacked; grid lines at the edges only |

## Data cases

- Plan prices come from `PLAN_PRICES`; layout must hold a longer price such as `$29.99`.
- Step titles wrap to two lines on phone.
- FAQ answers range from one line to a short paragraph.

## Out of scope

- The app-wide Accent color and all signed-in screens.
- Page copy and prices. Prices follow the payments tickets.
- The top bar and footer layout. Only their colors change.

## Open questions

None open.

Closed:

1. Do the hero dots stay, or does the line grid replace them? **The dots stay.** They fill the whole page, hero included, on the same spacing as the grid columns. (Owner, 2026-11-10, grid section.)
2. When Monthly saves nothing, what does its card show? **No badge and no gradient; it looks like Weekly.** (Owner, 2026-11-10, section 4 worst-case check.)
3. Log in and Sign up scroll sideways from 1024 to 1199 px wide and cut off the preview card (#798, also on the live site). **The side panel shows only from 1200 px; below that, the top glow is used.** (Owner, 2026-11-10, section 5 worst-case check.)

## Sections

In build order. Fill a row when the owner approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Hero (colors, hero cards, product screen frame) | Wallpaper (round 2) | Your gradient as a rounded backdrop behind the product screen, on the light page | Owner prefers the original light page; round 1 dark heroes (Horizon, Stage, Spotlight) were turned down. Picked Wallpaper 2026-11-10. |
| 2. Line grid through the page | Graph paper | Texture: page-wide dots aligned to the columns, with dashed lines at 0, 25, 75, and 100% from the hero to the footer | Owner keeps the dots. The center (50%) line is held back in the hero and starts below it; phone shows only the two side lines. No grid motion. Approved 2026-11-10. Worst-case check: long section labels wrap with a hanging indent; dots stay on the lines at 320–2560 px and 200% zoom. |
| 3. How it works | Pin | Scroll-pinned step swap with the original motion and a shorter hold (about 1.25 screens, was 2.5) | Owner kept the pinned swap over Swap, Alternating, Rail, and Board. No large heading. The short sentence sits at the top of the pin over a dashed rule; "STEP 0N / 04" and the four step bars sit right above the step title; panels shade Abyss Blue to Silver Mist. Hierarchy fixes approved: quieter sentence, bars close to the title, screens cropped so their own step labels are hidden. Approved 2026-11-10. Worst-case check: the pin shows only when it fits (desktop width, or tablet width with a window at least 800 px tall); otherwise the stacked list shows. Step titles are 24 px from 1024 to 1279 px. Content rule: the underlined key words stay at 18 characters or fewer so they never wrap. |
| 4. Pricing, FAQ, Start, footer in the new colors | Dusk (Bookend pricing + Nightfall ending) | Gradient as a frame for the Monthly plan; the page closes dark: Start fades Silver Mist → Abyss Blue → Void Eclipse into a Void Eclipse footer | Owner liked the Bookend pricing and loved the Nightfall desktop ending, and picked the mix over Quiet, Bookend, and Nightfall. Plan cards sit in light-gray frames; Monthly sits on the hero gradient with a Void Eclipse badge. Open FAQ icon is Abyss Blue. Grid lines and dots continue in a light tint on the dark band. The large "FAQ" word stays (owner, 2026-11-10). Prices follow main: $10 / $29.99. Approved 2026-11-10. Worst-case check: below 360 px the price is 38 px and the card padding 20 px so "$29.99 a month" stays on one line; long FAQ questions and answers wrap cleanly; no sideways scroll at 320–1440 px or 200% zoom. |
| 5. Log in and Sign up gradient | Glow | A soft light that falls from the top: Void Eclipse core, a wide Abyss Blue body, fading to Silver Mist. Desktop: on the light preview panel behind the card. Tablet and phone: at the top of the page, with the DrillMap logo centered in light text | Owner picked Glow over Wallpaper and Banner for both pages, then asked to fix the plain, off-center tablet and phone screens and for more color. Approved 2026-11-10. Worst-case check: the longest notice ("Google sign-in didn't finish…") wraps cleanly; the heading always starts below the glow; the side panel shows from 1200 px and the top glow below that (fixes #798); the form column is centered at every width under 1200 px, 200% zoom included; on screens under 500 px tall the glow is 152 px so the heading stays in the first view. No new motion: the glow fades in with the page. |
