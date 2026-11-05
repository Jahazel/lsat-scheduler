# Design brief: Page transitions

Tracking ticket: #580

## Job
A visitor moves from the landing page into sign up or log in, and a new student moves through onboarding to This week. Each page change should feel like one site moving, not a page swap. The motion must match the rest of the site: the same durations, curves, and fade style as Progress.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Landing | Taps "Start free week" (top bar, hero, or closing section) | Sign up |
| Landing | Taps "Log in" | Log in |
| Sign up | Taps "Log in" | Log in |
| Log in | Taps "Sign up" | Sign up |
| Log in | Taps "Forgot password" | Forgot password |
| Forgot password | Taps "Log in" | Log in |
| Reset password | Taps "Log in" | Log in |
| Sign up | Submits the email form | Verify email |
| Verify email | Taps "Sign up again" or "Log in" | Sign up or Log in |
| Any sign-in page | Taps the logo | Landing |
| Any sign-in page | Taps Terms, Privacy, or AI disclosure | That legal page |
| Any page in scope | Presses the browser's back button | The previous page (in onboarding, the page before onboarding, not the previous step) |
| Sign up or log in | Signs in for the first time | Onboarding (may show its loading placeholder first) |
| Onboarding step | Taps "Continue" | The next step (Goal → Week → Analytics → Review) |
| Onboarding step | Taps "Back" | The previous step |
| Onboarding | Taps "Skip for now" or finishes Review | This week |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Page change · fade with anchors | Any page change in scope | The logo stays still. The old content fades out. The new content fades in and rises a few pixels. |
| Sign-in page ↔ sign-in page | Moving between sign up, log in, forgot password, reset password, verify email | The layout and the preview panel stay still. Only the form and the preview card content change. |
| Onboarding · Continue | Moving to the next step | The new step moves in a few pixels from the right (about 8–12 px). The step label and frame stay still. |
| Onboarding · Back | Moving to the previous step | The new step moves in a few pixels from the left. |
| Browser back | The browser's back button | The same fade as a forward click, with no direction. Onboarding steps are not history entries, so back leaves onboarding; only the in-page Back button moves to the previous step. |
| Loading placeholder → page | Onboarding loads after sign-in | The placeholder fades out and the page fades in. |
| Phone width | Any move in scope at phone width | The same motion with a smaller rise. |
| Reduced motion | The device has "reduce motion" on | A plain fade with no movement, or no motion. |
| Interrupted | The user clicks again during a motion | The motion continues from where it is. It must not jump or add a second history entry. |
| No browser support | The browser cannot run page motion | The pages change as they do today. Nothing breaks. |

## Data cases
- Destination ready at once (the link was prefetched) and destination still loading (slow network).
- A sign-in page that opens with a notice or an error message at the top.
- Onboarding Analytics step with screenshots added ("Check the values" opens Review) and without them.
- Keyboard users: focus moves to the new page or step heading after the motion, as onboarding does today.

## Out of scope
- Moves between app pages (This week, Progress, Study settings, Account, Admin). The owner chose the signed-out pages and onboarding for now. This week is the only app page included, reached from onboarding or, since the owner's change on 2026-11-05, from Log in.
- "Continue with Google", which leaves the site for Google's page.
- Browsers without page-motion support. They keep today's plain page change.
- In-page motion that already exists, such as landing reveals and FAQ rows.

## Open questions
1. How do real sites move from a marketing page into sign up or log in, and what do they keep still?
2. How do sites with a split layout (form + preview panel) switch between sign up and log in?
3. How far, how fast, and with which curve should a step-by-step setup move between steps, so that it shows direction and does not feel like a slideshow?
4. How should a loading placeholder hand off to the real page?
5. Which motion values (durations, curves, rise distance) match the approved Progress motion, so the site stays consistent?
6. Flow and motion: what does each move look like when interrupted, on a phone, and with reduced motion on?

## Directions
Not yet built.

The owner chose on 2026-11-04 to skip the three layout directions and the tablet and phone boards. This work changes no layout; every page keeps its approved look, and only the motion between pages is new. Still boards cannot show motion, and the owner had already settled every motion choice in the brief and findings. The prototype below replaces them.

## Prototype
A throwaway clickable prototype is at `prototype/index.html`. Open the file in a browser. It has no build step and no saved data. Its control bar switches the width (1440, 768, 390), the motion mode (follow system, full, reduced), a ×5 slow-motion switch, and a fast or slow load, which shows or hides the loading placeholder. The state line shows the URL, the last transition with its timing, the focused element, and the history length.

Motion in the prototype (one set, matching Progress):
- Between pages with different layouts (landing, sign-in pages, onboarding, This week): fade through. The old content fades out in 120 ms (fast, exit easing). The new content fades in over 200 ms (base, standard easing) and rises 8 px (4 px on a phone). The logo never fades. When its spot differs, as from the landing top bar to the sign-in corner, it glides there over 200 ms with the standard easing.
- Between sign-in pages: the frame, preview panel, and legal links stay still. Only the form and the preview card do the fade through.
- Landing ↔ Terms: the top bar stays still. Only the page content does the fade through.
- Onboarding Continue and Back: the step fades out while moving 8 px away, then the new step fades in from 8 px on the other side. Continue comes from the right; Back comes from the left. The step label, top bar, and preview panel stay still.
- Loading placeholder → onboarding: the placeholder content fades out and the step fades in. The top bar and panel stay still. With a fast load, there is no placeholder.
- Browser back and forward: the same motion as the link, with no direction. The page returns to the scroll spot the student left.
- Reduced motion: a 120 ms fade in, no movement, no glide. This matches Progress.
- A second click while a transition runs: it continues from where it is toward the newest target. A double click adds one history entry. The old page cannot be clicked while it fades out.
- After each change, focus moves to the new page or step heading.

Impeccable motion review, 2026-11-04 (two isolated reviewers; the detector found nothing):
- Fixed: the old page stayed clickable while it faded out. It is now inert and marked busy.
- Fixed: focus fell to the page body while the old page faded out. It now stays on the content area until the new heading takes it.
- Fixed: in reduced motion, the logo blinked for one frame. It now stays visible.
- Fixed: the logo glide used a different curve from everything else. It now uses the standard easing.
- Fixed: browser back to the landing page lost the scroll spot. It now returns to it.
- Fixed: the onboarding step slide was 4 px on a phone and barely showed direction. It is now 8 px at every width.
- Not adopted: overlapping the fade-out and fade-in by 40 ms, and a cross-fade for reduced motion. Both would differ from the approved Progress motion. The measured total is about 280 ms.
