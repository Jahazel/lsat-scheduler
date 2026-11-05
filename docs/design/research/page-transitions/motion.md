# Motion spec: page transitions

The owner approved this motion in the prototype on 2026-11-04 (`prototype/index.html`). It is the same motion set as Progress (`../progress/motion.md`), so the site moves one way everywhere.

Durations are the design-system tokens: fast 120 ms, base 200 ms. Easings: standard `cubic-bezier(0.2, 0, 0, 1)` (`--ease-standard`), exit `cubic-bezier(0.4, 0, 1, 1)` (`--ease-exit`). Reduced motion follows the design system: drop movement, keep a 120 ms fade in with the standard easing (`--ease-standard`).

Purpose of every row: prevent a jarring change. Each page change happens a few times per visit, so a short fade is in budget. Properties are `opacity` and `transform` only.

**Token conflict.** `--ease-exit` is an ease-in curve. The animate rules forbid ease-in on UI because it delays the start of the motion. Progress already ships with it, and the owner's goal is one motion everywhere, so these rows use it too. A follow-up changes the token itself in `src/app/globals.css`, which fixes Progress and these pages together.

## Terms

- **Fade through**: the old content fades out (fast, exit easing). Then the new content fades in (base, standard easing) and rises 8 px, or 4 px on a phone (390 px and narrower).
- **Anchors**: the parts that stay still during a change. They never fade.
- **Shared axis**: the same as fade through, but the content moves sideways 8 px instead of rising, to show direction.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Page content | Landing → Sign up or Log in ("Start free week" in the top bar, hero, or closing section; "Log in") | Fade through. The top bar leaves with the landing content. The logo does not fade: it glides from the top-bar spot to the sign-in corner. Focus moves to the page heading. | Out: fast, exit easing. In: base, standard easing. Logo glide: base, standard easing. | 120 ms fade in, no movement, no glide. The logo stays visible. Same focus. |
| Page content | Any sign-in page → Landing (taps the logo) | Fade through, the reverse path. The logo glides back to the top-bar spot. Focus moves to the page heading. | As above | As above |
| Form and preview card | Sign-in page → sign-in page (Sign up ↔ Log in, Log in → Forgot password, Forgot password → Log in, Reset password → Log in, Sign up submit → Verify email, Verify email → Sign up or Log in) | Fade through on the form column and the preview card only. Anchors: the frame, the logo, the preview panel, and the legal links. A notice or error message at the top of the form fades with the form. Focus moves to the form heading. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in on the form and card, no movement. Same focus. |
| Page content | Landing → Terms, Privacy, or AI disclosure | Fade through on the page content. Anchor: the top bar. Focus moves to the page heading. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same focus. |
| Page content | Sign-in page → Terms, Privacy, or AI disclosure | Fade through, the same as Landing → Sign up in reverse: the logo glides to the top-bar spot. | As the Landing rows | As the Landing rows |
| Page content | Sign up or Log in → Onboarding (first sign-in), fast load | Fade through. The logo glides to the onboarding top-bar spot when its spot differs. Focus moves to the step heading. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement, no glide. Same focus. |
| Page content | Log in → This week (a returning student's password sign-in; also the weekly upload when This week first asks for analytics) | Fade through, the same as Log in → Onboarding. Log in stays on screen, still and inert, while This week loads. The logo glides to the top-bar spot. Focus moves to the page heading. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement, no glide. Same focus. |
| Loading placeholder | Onboarding is still loading after sign-in | Sign-in page → placeholder: fade through. Placeholder → first step: the placeholder content fades out and the step fades in and rises. Anchors: the top bar and the preview panel. With a fast load there is no placeholder. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. |
| Onboarding step | "Continue" → next step (Goal → Week → Analytics → Review; "Check the values" on Analytics → Review) | Shared axis: the step fades out while it moves 8 px left, then the next step fades in from 8 px on the right. Anchors: the step label, the top bar, and the preview panel. 8 px at every width so the direction still shows on a phone. Focus moves to the step heading. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement. Same focus. |
| Onboarding step | "Back" → previous step | Shared axis, mirrored: out to the right, in from 8 px on the left. Same anchors and focus. | As above | As above |
| Page content | Onboarding → This week ("Skip for now" or finishing Review) | Fade through. The logo glides when its spot differs. Focus moves to the page heading. This week is in scope only when reached from onboarding or from a sign-in page. | Out: fast, exit easing. In: base, standard easing. | 120 ms fade in, no movement, no glide. Same focus. |
| Page content | Browser Back or Forward between pages in scope | The same motion as the link that leads to the same page, with no direction. The page returns to the scroll spot the student left. Onboarding steps are not history entries, so Back leaves onboarding. | As the matching row | As the matching row |
| Page content | A second click while a transition runs | The running transition continues from where it is, toward the newest target. It never jumps back to full opacity. A second click on the same link adds no history entry. The old content cannot be clicked while it fades out (it is inert and marked busy with `aria-busy`). | Out phase shortens in step with the opacity left. | Same |
| Page content | Google sign-in → Onboarding, This week, or Admin ("Continue with Google" on Sign up or Log in) | Fade in only. Google's page leaves the site, so there is no old page to fade out, and Log in does not fade before Google loads. The new page's regions start hidden on the first frame, then fade in and rise 8 px (4 px on a phone). A CSS animation runs it, so it plays before scripts load. The logo stays still. A loading screen fades in, and the page that replaces it fades in too, also after a redirect. A reload, and the Account deletion Google sign-in, have no fade. Focus stays where the browser puts it on a page load. | In: base, standard easing. | 120 ms fade in, no movement. |
| Page content | A browser that cannot run page motion | None. The page changes as it does today. Nothing breaks. | — | Same |
| Page content | A signed-in student opens Terms, Privacy, or AI disclosure, or leaves one (the footer links, the logo) | None. Signed-in pages change with no motion, so a redirect after the logo never shows half a change. Signed-out visits keep the legal rows above. | — | Same |

**Owner change, 2026-11-05.** The Log in → This week row replaces the earlier rule that This week after Log in changes with no motion. The same fade runs when a signed-in student leaves any sign-in page for This week.

**Owner change, 2026-11-05 (Google).** The Google sign-in row replaces the earlier rule that Google sign-in changes with no motion. It covers students and Admins. The owner chose a fade in only, with no fade-out of Log in before Google.

Each heading takes focus with no visible ring, which is the usual pattern when the page moves focus. The next Tab stop shows the ring. A full change takes about 320 ms (120 ms out, then 200 ms in).
