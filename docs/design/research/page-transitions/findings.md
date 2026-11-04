# Findings: Page transitions

Brief: [brief.md](brief.md). Tracking ticket: #580.

Mobbin returned desktop web examples for every question. Mobbin shows still frames only, so every motion read from Mobbin is marked **inferred**. The examples are linked below. The screenshots stay out of this public repository because they show other companies' apps, the same rule as Progress, so `refs/` is empty. Phone examples are labeled mobile and appear only in question 6.

Mark each pattern on its `Owner:` line: like, dislike, or leave it blank.

DrillMap fit is judged against these facts from the repo:
- Motion tokens in `src/app/globals.css`: `fast` 120 ms, `base` 200 ms, `slow` 320 ms, `reveal` 600 ms. Easings: standard `cubic-bezier(0.2, 0, 0, 1)`, exit `cubic-bezier(0.4, 0, 1, 1)`, plus out-strong, in-out-strong, and float.
- The approved Progress motion ([motion.md](../progress/motion.md)): the old page fades out in 120 ms with the exit easing, and the new page fades in in 200 ms with the standard easing. Older and Newer add an 8 px slide. Reduced motion is a 120 ms fade with no movement.
- Each sign-in page (`login`, `signup`, `verify-email`, and so on) renders `SignInFrame` itself. There is no shared `layout.tsx` in those folders, so the frame is built again on every page change.
- Onboarding is one client page. Its step is state in `OnboardingWizard.tsx` (`state.step`), not a route, and it does not add browser history entries (checked: no `history`, `pushState`, or router calls in the file).

## 1. How do real sites move from a marketing page into sign up or log in, and what do they keep still?

### 1A. Fade through, with the top bar held still
- Examples (desktop web, motion **inferred**): [Sana landing flow](https://mobbin.com/flows/6b0d8fa4-8dab-4e4b-abd4-cdd79cc43fcc) and [Sana landing and sign-up flow](https://mobbin.com/flows/05acb447-5a1d-4b1c-b8c6-a9533206a341). The logo and the pill nav sit at the same spot on the sign-up page and on every overlay. Only the content below changes.
- Material calls this "fade through": "used for transitions between UI elements that do not have a strong relationship to each other" ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: the two pages share one header and the visitor should feel they stayed on one site.
- Tradeoffs: the anchor must sit at the same spot on both pages. DrillMap's landing top bar and the sign-in logo are not in the same spot today.
- DrillMap fit: strong. It is the same fade through as Progress. The logo is the anchor to keep still.
- Owner: —

### 1B. Whole-page swap with different chrome
- Examples (desktop web, motion **inferred**): [Kajabi onboarding flow](https://mobbin.com/flows/8fe9c347-0e57-442a-8bde-53c5db4c1d2d) (a full marketing nav, then a free-trial page with no nav), [Square sign up from referral](https://mobbin.com/flows/cab10c35-7722-4353-8755-128b4514a675) (centered logo only).
- Works when: the sign-up page is meant to feel like a separate, focused task.
- Tradeoffs: nothing carries over, so the move reads as a page swap. That is the opposite of the brief's goal.
- DrillMap fit: weak. It is today's behavior.
- Owner: —

### 1C. Sign up opens over the landing page
- Examples (desktop web, motion **inferred**): [Subframe sign up](https://mobbin.com/screens/978c7249-7b3c-4f4c-9c1d-2c2beecb7999) (a card over the dimmed landing page with its nav still visible), [Sana overlays](https://mobbin.com/flows/05acb447-5a1d-4b1c-b8c6-a9533206a341) (pricing and FAQ open as cards over the form page).
- Works when: the visitor may close it and go back to reading.
- Tradeoffs: it needs a modal with focus handling, and a new route shape. The brief keeps sign up as its own page.
- DrillMap fit: weak. It changes the flow map.
- Owner: —

Researcher's view: 1A. Keep the logo still; fade the rest.

## 2. How do sites with a split layout (form + preview panel) switch between sign up and log in?

### 2A. Layout and panel stay still; only the form changes
- Examples (desktop web, motion **inferred**): [Sprig log in](https://mobbin.com/screens/abd2da24-0cfe-43d8-ab44-1900f7477a1d) and [Sprig sign up](https://mobbin.com/screens/64806a41-f418-4e5d-8570-cf303ff842f4) (same two halves, logo top-left, panel on the right), [Square log in](https://mobbin.com/screens/51358a95-0a92-40ef-b433-8120fe1bf67e), [Unify log in](https://mobbin.com/screens/8886aa55-0ba2-45c2-a70f-b7bc1350e693), [Searchable create account](https://mobbin.com/screens/67108345-cd0e-47f4-bb3d-fff2befd189e), [Luma create account](https://mobbin.com/screens/e5c733db-7952-40fb-9f52-fad8c39e3870).
- Material: shared axis is for "transitions between UI elements that have a spatial or navigational relationship" ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: both pages use the same two-column frame at the same size.
- Tradeoffs: the frame must be one shared element. Today each page builds its own `SignInFrame`, so a shared layout is needed. That is a code change, not a design choice.
- DrillMap fit: strong. It matches the brief.
- Owner: —

### 2B. Panel content changes too
- Examples (desktop web, motion **inferred**): Sprig again. The log-in panel shows a photo with a report card. The sign-up panel shows a gradient with a customer quote. The panel frame is the same; the content is not.
- Works when: each page has its own message in the panel.
- Tradeoffs: the panel content needs its own short fade. If it fades more slowly than the form, the two halves look out of step.
- DrillMap fit: strong. DrillMap's preview card content changes per page. Fade it with the form, on the same tokens.
- Owner: —

### 2C. Whole page fades, panel included
- Examples (desktop web): [incident.io sign up](https://mobbin.com/screens/437e0f78-2a51-426d-84bd-121eebee389b) (panel on the left) and [Searchable create account](https://mobbin.com/screens/67108345-cd0e-47f4-bb3d-fff2befd189e) (panel on the right).
- Works when: the pages have different layouts.
- Tradeoffs: the panel flickers off and on between two pages that look almost the same.
- DrillMap fit: medium. It is the safe fallback if the shared frame is not built.
- Owner: —

Researcher's view: 2A with 2B. Hold the frame; fade the form and the card together.

## 3. How far, how fast, and with which curve should a step-by-step setup move between steps?

### 3A. Small slide toward the step's side, with a fade
- Examples (desktop web, motion **inferred**): [Laravel Cloud survey flow](https://mobbin.com/flows/50d44602-9183-47a6-8e5f-91782acd2840) ("Question 1 of 3" with Continue and Skip; the frame and header stay the same on every step), [Kajabi onboarding](https://mobbin.com/flows/8fe9c347-0e57-442a-8bde-53c5db4c1d2d) (a progress bar over a step, with "Go Back" and "Continue").
- Material: shared axis moves with "a shared transformation on the x, y, or z axis" ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: the steps are in a fixed order, so Continue goes one way and Back goes the other.
- Tradeoffs: a long slide reads as a slideshow. Next's own demo uses a 60 px slide for page routes ([Next.js, View transitions](https://nextjs.org/docs/app/guides/view-transitions)). That is far more than DrillMap wants.
- DrillMap fit: strong at 8 to 12 px. 8 px matches Progress exactly. NN/g says most animations should run 100 to 500 ms, and entering elements run slightly longer than exiting ones ([NN/g, Animation duration](https://www.nngroup.com/articles/animation-duration/)). Progress's 120 ms out and 200 ms in follows that.
- Owner: —

### 3B. Fade only, direction shown by the step label
- Examples (desktop web, motion **inferred**): Laravel Cloud and Kajabi above also show a step count or bar.
- NN/g: wizards should keep "a clear labeling of each of the steps as well as a clear indicator of the current step" ([NN/g, Wizards](https://www.nngroup.com/articles/wizards/)).
- Works when: the label and the Back button are clear.
- Tradeoffs: Back gives no motion cue.
- DrillMap fit: medium. It is the reduced-motion path. It drops the owner's choice "Back moves from the left".
- Owner: —

### 3C. Full-width slide between steps
- Examples: none found in desktop web flows on Mobbin. Material's shared axis defaults to 300 ms ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: each step is a big screen and the app wants a carousel feel.
- Tradeoffs: it is slow. NN/g: "400ms being a very slow animation, to be used only for big movements across large screens" ([NN/g, Animation duration](https://www.nngroup.com/articles/animation-duration/)).
- DrillMap fit: weak. It breaks the consistency goal.
- Owner: —

Researcher's view: 3A at 8 px (up to 12 px), with the Progress timings.

## 4. How should a loading placeholder hand off to the real page?

### 4A. Placeholder fades out as the page fades in, same layout
- Examples (desktop web, motion **inferred**): [Mintlify sign up](https://mobbin.com/screens/accb9ae5-2aef-4300-a804-cb1be049aa5a) (a grey, page-shaped preview beside the form).
- NN/g: "The structure of the gray boxes mimics the structure of the final page with content" ([NN/g, Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)). NN/g also says "If a page takes less than 1 second to load, skeleton screens or spinners aren't necessary."
- Works when: the placeholder matches the page's layout, so the swap changes content and not position.
- Tradeoffs: onboarding needs a placeholder shaped like its page. Today it uses the generic app placeholder.
- DrillMap fit: strong. Progress did this in #569: its placeholder is shaped like the page.
- Owner: —

### 4B. Old page stays dimmed until the next one arrives
- Examples: DrillMap's own Progress. The old page stops at 50 % opacity, and the new page fades in from 50 % ([motion.md](../progress/motion.md)).
- Works when: the student leaves a real page and the next one is slow.
- Tradeoffs: after sign-in, the old page is the sign-in form, which does not help.
- DrillMap fit: medium. It matches Progress, but fits sign-in → onboarding poorly.
- Owner: —

### 4C. Plain swap with no motion
- Examples: today's behavior.
- Works when: the load is fast.
- Tradeoffs: a late swap flashes.
- DrillMap fit: medium. It is the no-support path.
- Owner: —

Researcher's view: 4A, with no placeholder at all when the page is ready within a second.

## 5. Which motion values match the approved Progress motion?

### 5A. Reuse the Progress numbers exactly
- Facts: Progress uses out `fast` 120 ms with the exit easing, in `base` 200 ms with the standard easing, and an 8 px slide ([motion.md](../progress/motion.md)).
- Material's standard easing is `cubic-bezier(0.2, 0, 0, 1)`, the same as DrillMap's `--ease-standard` ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- NN/g: "the duration of most animations should be in the range of 100–500 ms" ([NN/g, Animation duration](https://www.nngroup.com/articles/animation-duration/)).
- Works when: the goal is that these pages feel like Progress.
- Tradeoffs: the fade is quick, so a student who looks away may miss it. Apple: "Aim for brevity and precision in feedback animations" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
- DrillMap fit: strong. Every value is already a token.
- Owner: —

### 5B. Use the Material defaults (300 ms)
- Facts: "Shared axis and fade through: 300ms" is the Material default ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: the move covers a whole screen.
- Tradeoffs: it is slower than Progress, and out and in run the same length.
- DrillMap fit: medium. `slow` (320 ms) is close, but it is not the Progress pairing.
- Owner: —

### 5C. Copy the Next.js guide's demo values
- Facts: exit 150 ms, enter 210 ms, a 10 px rise, and a 60 px route slide ([Next.js, View transitions](https://nextjs.org/docs/app/guides/view-transitions)).
- Works when: the app has no tokens of its own.
- Tradeoffs: DrillMap has tokens. The idea (fast out, slower in) matches Progress; the numbers do not.
- DrillMap fit: weak.
- Owner: —

Researcher's view: 5A.

## 6. Flow and motion: what does each move look like when interrupted, on a phone, and with reduced motion on?

### 6A. Interrupted: the new motion wins, and history stays clean
- Facts: starting a new view transition skips the running one, and its update "is always called, even if the transition cannot happen" ([CSS View Transitions spec](https://drafts.csswg.org/css-view-transitions-1/)). The old snapshot is a still image, so it cannot be clicked ([MDN, Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using)).
- Works when: the page starts a transition only on a real change.
- Tradeoffs: onboarding's Continue and Back must be ignored while a step is saving.
- DrillMap fit: matches the brief and Progress. It needs a test: two quick clicks give one history entry.
- Owner: —

### 6B. Phone: same motion, smaller rise
- Examples (mobile, motion **inferred**): [Me+ log in](https://mobbin.com/flows/cc2d9de9-2e89-47fe-8389-f90f34aeb336) and [Kitchen Stories log in](https://mobbin.com/flows/c135b423-a476-4018-9373-5f379ba4b143). Both show log in as a full-screen page with no side panel.
- Works when: the layout is one column, so only the form moves.
- Tradeoffs: a long slide on a narrow screen crosses the whole width.
- DrillMap fit: strong. Use a 4 to 6 px rise. This is a design choice, not a sourced number.
- Owner: —

### 6C. Reduced motion: keep the fade, drop the movement
- Facts: `prefers-reduced-motion: reduce` asks for less movement, "preferably to the point where all non-essential movement is removed" ([web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)). Next's guide says directional slides are "the most common trigger for motion sensitivity," while crossfades "carry less risk" ([Next.js, View transitions](https://nextjs.org/docs/app/guides/view-transitions)). Apple: "Make motion optional" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
- Works when: the fade is short and has no movement.
- Tradeoffs: none that stand out.
- DrillMap fit: strong. It is the Progress rule: a 120 ms fade only.
- Owner: —

## Flow and motion

Proposals only. They become `motion.md` rows later. NN/g says a response should begin "within 0.1 seconds of the initial user action" ([NN/g, Animation usability](https://www.nngroup.com/articles/animation-usability/)).

| Step in the flow map | Proposed motion | Token | Reduced motion |
| --- | --- | --- | --- |
| Any page change in scope (landing, sign-in pages, legal pages) | Fade through. The logo stays still. Old content out; new content in with an 8 px rise | Out: `fast`, exit easing. In: `base`, standard easing | 120 ms fade, no movement |
| Sign-in page to sign-in page | Frame and preview panel stay. Form and preview card fade through together | Same | Same |
| Onboarding Continue | New step moves in 8 to 12 px from the right. Step label and frame stay | Same | 120 ms fade, no movement |
| Onboarding Back | Mirrored: from the left | Same | Same |
| Browser back | Same fade as forward, no direction | Same | Same |
| Loading placeholder to page | Placeholder fades out, page fades in. No placeholder if ready in under 1 s | Same | 120 ms fade |
| Phone width | Same motion, 4 to 6 px rise | Same | Same |
| Interrupted | Continue toward the newest target. No second history entry | — | Same |
| No browser support | Plain page change, as today | — | — |

### How a Next App Router app can get page motion

These are facts and tradeoffs, not a pick. No option has been built or tested yet.

1. **React's `<ViewTransition>`, from Next's own React.** This repo's `node_modules/react` is 19.2.8 and has no `ViewTransition`. Next 16.4.2 ships its own React for the App Router at `node_modules/next/dist/compiled/react`, version `19.3.0-canary-278794d7-20261002`, and that copy exports `ViewTransition` (checked). Next's guide says "View transitions work in the App Router with no configuration" ([Next.js, View transitions](https://nextjs.org/docs/app/guides/view-transitions)). `@types/react` 19.2.18 declares it only in `canary.d.ts`, so the repo needs the canary types. It supports exit and enter animations. A layout that persists across navigations stays still. `<Link transitionTypes>` tags forward links; browser back carries no type, so it gets a plain fade. Plain `setState` does not trigger it, so onboarding step changes need `startTransition`. Browsers without support change pages as today.
2. **A manual `document.startViewTransition` around navigation.** It supports exit and enter animations and `view-transition-name` anchors ([MDN, `startViewTransition`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)). Next's route change is async, and no Next source describes this wiring. Browser back is not covered.
3. **Cross-document `@view-transition { navigation: auto }`.** It runs only on full page loads ([MDN, `@view-transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition)). App Router links are client navigations, so it would rarely run (inference).
4. **`template.tsx` with an enter-only CSS animation.** A template remounts on each navigation ([Next.js, `template.js`](https://nextjs.org/docs/app/api-reference/file-conventions/template)). It has no exit animation (inference), so it cannot match Progress's "out, then in".
5. **CSS only, inside onboarding.** A keyed step with a mount animation gives enter-only motion. The step label and frame stay still.

| Option | Exit animation | Logo and panel stay still | Browser back |
| --- | --- | --- | --- |
| 1. `<ViewTransition>` (Next's React) | Yes | Yes (a shared layout, or a shared `name`) | Fade, no direction |
| 2. Manual `startViewTransition` | Yes | Yes (`view-transition-name`) | Not covered |
| 3. `@view-transition` | Yes | Yes | Only on full page loads |
| 4. `template.tsx` enter-only | No | Only if the frame moves to a layout | Same enter animation |
| 5. CSS only, onboarding | No | Yes | Not applicable |

### Facts that changed the brief
- The brief said React has no `<ViewTransition>`. The React that Next uses for the App Router does have it. See option 1.
- Onboarding steps are not browser history entries. The browser's back button leaves onboarding; it does not go to the previous step. The brief now says so.
- The shared-element hold plays only when the destination is ready in the same render, "which is the case with prefetched (cached) pages" ([Next.js, View transitions](https://nextjs.org/docs/app/guides/view-transitions)). A slow destination gets its enter animation instead.

## Source gaps
- m3.material.io and Apple HIG load their text with JavaScript. Material quotes come from the Material Components for Android docs. Apple quotes come from the page's JSON data.
- Mobbin flows are still frames, so every Mobbin motion is inferred. No web flow showed a sign-up ↔ log-in switch as consecutive frames.
- Desktop web wizard flows are thin on Mobbin. Laravel Cloud and Kajabi were the closest.
- MDN's `@view-transition` browser table did not load. Baymard was not searched.
