# Page motion

Plain same-origin link clicks between the landing page `/` and the sign-in pages (`/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`) fade the old page out and the new page in. Source: `src/components/SiteMotion.tsx`, with the shared pieces in `src/lib/motion.ts`. Progress has its own week-change motion; see [Progress](progress.md). Signed-in pages other than onboarding and This week (arriving from onboarding), modifier clicks, and Google sign-in change with no motion.

## Sub-features

- `motion-landing-sign-in` (#584): landing to Sign up or Log in, and the reverse. Every `[data-page-fade]` and `[data-page-swap]` region fades out, then the new page's regions rise 8 px (4 px at 390 px and narrower) and fade in. The old regions are `inert` with `aria-busy="true"` while they fade out.
- `motion-logo-glide` (#584): the logo never fades. When its spot differs between the two pages, the visible `[data-page-logo]` glides from the old spot with one `translate(x, y)` animation.
- `motion-form-fade` (#585): between two sign-in pages, only the `[data-page-swap]` regions (the form and the preview card) fade. The page frame and logo stay still.
- `motion-history` (#584): Back and Forward use the same fade and return the landing page to its saved scroll spot.
- `motion-focus`: on arrival, focus moves to the new page's `main h1` with no visible ring.
- `motion-reduced`: with reduced motion, the new page fades in over 120 ms with no rise and no logo glide.
- `motion-server-change` (#587): a password Log in that leads to `/onboarding`, `Skip for now` or `Looks right` on onboarding (to `/dashboard` or `/dashboard/upload`), and Back from onboarding are server changes: the router replaces the page in one step. Each page in them renders `PageCue`. The page that goes is kept on screen as an inert, `aria-busy` copy in `[data-page-copy]`, fixed where it was, until the next page reports. Then the copy fades out (120 ms) and the new page's regions fade in and rise, the logo glides, and focus moves to `main h1`. Log in that leads anywhere else (This week, Admin) drops the copy with no motion.
- `motion-onboarding-placeholder` (#587): on a slow load the onboarding placeholder (`src/app/onboarding/loading.tsx`) fades in after the Log in copy. When the step replaces it, only its `[data-page-swap]` regions (the step column and the preview card) leave as a copy and the step's swap regions fade in. The top bar and the preview panel stay still. When the step arrives during the Log in copy's fade-out, the placeholder never shows.
- `motion-onboarding-step` (#588): on `/onboarding`, Continue and `Check the values` fade the `[data-onboarding-step]` region out (120 ms) while it moves 8 px left, then the next step fades in (200 ms) from 8 px on the right. Back mirrors it. The region is `inert` and `aria-busy` during the fade-out. The step label, top bar, and preview panel do not animate. The slide is 8 px at every width. Focus moves to the step's `h1`. Steps are not history entries.

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

- For onboarding, sign up through the UI (the `smoke.mjs` signup and verification-link steps) so the Account has a password, then log in on `/login`. Before pressing `Log in`, patch `Element.prototype.animate` in `page.evaluate` to log each call; read the log after the `Set your target` heading shows. Expect a `[data-page-copy]` layer right after the press, one 120 ms fade-out on it, then 200 ms entrances on the onboarding regions and one logo glide, and `document.activeElement` on the `H1`. A dev server answers fast, so the placeholder is usually skipped; throttle with `page.route("**/onboarding*", ...)` delaying the RSC response to see it.
- On Step 3 press `Skip for now`. Expect the wizard copy to hold through `/dashboard` and the This week loading screen, then fade out as `Plan this week` (or the This week schedule) fades in.
- For the onboarding step slide, seed a `--not-onboarded` student per width (each run of the analytics step reads two screenshots, and the limit is 10 per day). Log each `Element.prototype.animate` call with `page.addInitScript`. A Playwright click is slower than the 200 ms slide-in, so make a second press mid-slide from `page.evaluate` and expect the exit's first keyframe to hold the current opacity and transform.

## Gotchas

- Read the fade-out state right after the click. The fast exit ends quickly, and the arrival removes `inert` and `aria-busy`.
- A `[data-page-swap]` inside a `[data-page-fade]` animates only through its outer region on a page change.
- Server changes are not held: the copy is what fades. Reading the old page's `inert` state after `Log in` finds nothing; read `[data-page-copy]` instead.
