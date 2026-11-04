# Page motion

Plain same-origin link clicks between the landing page `/` and the sign-in pages (`/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`) fade the old page out and the new page in. Source: `src/components/SiteMotion.tsx`, with the shared pieces in `src/lib/motion.ts`. Progress has its own week-change motion; see [Progress](progress.md). Signed-in pages, modifier clicks, and Google sign-in change with no motion. Legal pages and onboarding have no motion yet (issues 586 to 588).

## Sub-features

- `motion-landing-sign-in` (#584): landing to Sign up or Log in, and the reverse. Every `[data-page-fade]` and `[data-page-swap]` region fades out, then the new page's regions rise 8 px (4 px at 390 px and narrower) and fade in. The old regions are `inert` with `aria-busy="true"` while they fade out.
- `motion-logo-glide` (#584): the logo never fades. When its spot differs between the two pages, the visible `[data-page-logo]` glides from the old spot with one `translate(x, y)` animation.
- `motion-form-fade` (#585): between two sign-in pages, only the `[data-page-swap]` regions (the form and the preview card) fade. The page frame and logo stay still.
- `motion-history` (#584): Back and Forward use the same fade and return the landing page to its saved scroll spot.
- `motion-focus`: on arrival, focus moves to the new page's `main h1` with no visible ring.
- `motion-reduced`: with reduced motion, the new page fades in over 120 ms with no rise and no logo glide.

## How to get to it (user POV)

- On `/` signed out, click `Start free week` (top bar, hero, or closing band) or `Log in` (top bar, closing band, or footer).
- On `/signup` or `/login`, click the other page's link, `Forgot password?`, or the `DrillMap` logo back to `/`.
- Press Back or Forward between these pages.

## Driving it with browser tools

Use Playwright, because the checks read element state during the fade. Read state with short `page.evaluate` calls; do not set it.

- At 1440 px, open `/`, wait for `networkidle`, and scroll with `page.mouse.wheel(0, 600)`. Click `main >> role=link[name="Start free week"] >> nth=0`. Right after the click, read every `[data-page-fade]`: each must have `aria-busy="true"` and `inert`. Wait for `/signup` and the `Sign up for DrillMap` heading. Read `getAnimations()` on the visible `[data-page-logo]`: expect one animation whose first keyframe is a `translate(...)`. Expect `document.activeElement` to be the `H1`.
- On `/signup`, click `role=link[name="Log in"] >> nth=0`. Right after the click, every `[data-page-swap]` has `aria-busy="true"` and no `[data-page-fade]` region does. Wait for `Log in to DrillMap`.
- Press Back twice and wait for `/`. Expect `scrollY` equal to the spot you left (600). A scroll made with `window.scrollTo` in `page.evaluate` is not a reliable start for this check; scroll with the mouse wheel.
- Call `page.emulateMedia({ reducedMotion: "reduce" })`, click the top bar `Log in`, and expect no animation on any `[data-page-logo]`.
- Repeat at 768 and 390 px when the change touches layout. At 390 px the rise is 4 px.

## Gotchas

- Read the fade-out state right after the click. The fast exit ends quickly, and the arrival removes `inert` and `aria-busy`.
- A `[data-page-swap]` inside a `[data-page-fade]` animates only through its outer region on a page change.
