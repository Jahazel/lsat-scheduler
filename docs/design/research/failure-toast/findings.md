# Findings: failure toast

Brief: [brief.md](brief.md). Tracking ticket: #391 (build ticket #372).

The failure toast shows "Something went wrong. Try again." plus an 8-character hex error code. There is no Retry button. The examples are desktop web screens from Mobbin, saved in `refs/`. One phone group is labeled **mobile** and is used only for question 1. Mobbin shows still frames, so every motion read from it is marked **inferred**. Mobbin images belong to their apps, so `refs/` stays local and out of this public repository, as in the Progress run.

Mark each pattern on its `Owner:` line: like, dislike, or leave it blank.

DrillMap fit is judged against `DESIGN.md` and `docs/design/design-system/tokens.css`:
- Motion: 120 ms hover, 200 ms press and focus, 320 ms overlays. Reduced motion drops movement and keeps 120 ms fades.
- `shadow-e3` is listed for "Menus, popovers, the admin workspace dropdown, toasts" (`DESIGN.md` line 62).
- Danger tokens: `--color-danger` `#F0524F` (dots and icons), `--color-danger-ink` `#C23532` (text).
- The student tab bar (`src/components/nav/StudentNav.tsx` line 168) is `fixed inset-x-3 bottom-3 z-40`, items `min-h-16` (64 px), plus the safe-area inset. Its top edge is about 76 px plus the inset above the screen bottom.
- Today failures show as inline `role="alert"` paragraphs (`FailureNotice.tsx`, `OnboardingWizard.tsx`, `DropZone.tsx`).

## Source notes

- [NN/g, Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) is the closest NN/g source on toasts. A toast is "a small nonmodal popup that disappears after a few seconds". It "would be a bad way to implement an error message". A user missed "the little error message presented at the bottom of the screen that quickly faded away after 5 seconds" and waited 5 minutes.
- [NN/g, Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/): "Hide or minimize the use of obscure error codes or abbreviations; show them for technical diagnostic purposes only." Also: "never use exclusively color or animation to indicate errors".
- [Baymard, adaptive error messages](https://baymard.com/blog/adaptive-validation-Error-messages) covers field errors only. Nothing on toasts, codes, or disappearing messages.

## 1. Where does the toast sit on desktop and on mobile, and does it cover the bottom nav?

### 1A. Bottom-right corner
- Desktop web: [Posh](https://mobbin.com/screens/6561161d-a2f6-491d-ba69-e132d6d082e8) (code in brackets), [n8n](https://mobbin.com/screens/f70fc619-d6bf-4dff-958d-ef47afc0342e), [Wrangle](https://mobbin.com/screens/0426eefc-5740-4960-b10b-093c3ad9ce0c), [ManyChat](https://mobbin.com/screens/12b11895-aadc-412b-857d-b816721ea111), [Vercel](https://mobbin.com/flows/e308141d-c3cf-4838-a1cb-2e1927276c91). Refs: [posh](refs/posh-toast-error-code-bottom-right.webp), [n8n](refs/n8n-error-toast-bottom-right.webp), [wrangle](refs/wrangle-error-toast-bottom-right.webp), [manychat](refs/manychat-error-toast-bottom-right.webp), [vercel](refs/vercel-error-toast-after-toggle.webp).
- Works when: the page is a wide workspace and the toast sits near the page edge, away from the content.
- Tradeoffs: on a 1440 px screen the corner is far from a centered auth card, so the student may not see it. It can sit over a page's own bottom-right control.
- DrillMap fit: medium. No tab bar on desktop, so no clash.
- Owner: —

### 1B. Top-center or top-right
- Desktop web: [Dribbble](https://mobbin.com/screens/9abf2423-409d-4abb-9fdf-24d290062414) (covers the heading), [Google AI Studio](https://mobbin.com/screens/bd6669d2-d3df-476e-b933-e44bb25e5259), [Contra](https://mobbin.com/flows/e91f77ad-32f5-4839-b37f-da2adc6bc6dc), [Snowflake log in](https://mobbin.com/screens/13748743-d3c9-4292-983d-f434f6083bb6) (above the card, ID in brackets). Refs: [dribbble](refs/dribbble-error-toast-top-center.webp), [aistudio](refs/googleaistudio-error-toast-top-center.webp), [contra](refs/contra-error-toast-top-right.webp), [snowflake](refs/snowflake-login-error-id.webp).
- Works when: the page is short and the student looks at the top.
- Tradeoffs: it covers page titles and header actions. On a phone it collides with the status bar area.
- DrillMap fit: medium. Same place on log in and in the shell, but top space on phones is tight.
- Owner: —

### 1C. Bottom-center
- Desktop web: [TIDAL](https://mobbin.com/screens/548b60c5-b45d-4ca9-81db-17875594fcd5) ("Page failed to load. Please try again." with a Close button). Ref: [tidal](refs/tidal-close-toast-bottom-center.webp).
- Works when: the card or form is centered, as on log in and sign-up. The toast sits under what the student just pressed.
- Tradeoffs: it can hide a bottom page control. On phones it needs an offset (below).
- DrillMap fit: strong for auth cards and phones, medium on the wide admin workspace.
- Owner: —

### Mobile bottom-nav behavior (mobile; this question only)
- Refs (mobile): [Linear](refs/phone/linear-toast-above-floating-tab-bar.webp) ([screen](https://mobbin.com/screens/3d9ccfd8-2425-49e9-a00b-27189140d3a3): toast above a floating bar, bar stays tappable), [Qantas](refs/phone/qantas-toast-above-floating-tab-bar.webp) ([screen](https://mobbin.com/screens/18f77caf-19d5-4199-98b4-a36f34096d23): above the bar), [Jobber](refs/phone/jobber-toast-overlaps-tab-bar.webp) ([screen](https://mobbin.com/screens/750a3e8e-0eb4-4e75-aba7-6ea87254bce1): touches the bar and a round button), [Quo](refs/phone/quo-toast-covers-tab-bar.webp) ([screen](https://mobbin.com/screens/28233f22-360a-456d-9973-ef2942fdf2fa): covers the tab labels).
- [Material Components Android, Snackbar](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md): a snackbar is "anchored to the bottom edge of their parent view". To keep it above a FAB, `BottomAppBar`, or `BottomNavigationView`, set an anchor view. (The M3 spec page did not load.)
- [Apple HIG, Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts): alerts "interrupt the current task". Prefer "an alternative way to communicate it within the relevant context". HIG says nothing about a toast over a tab bar.
- Tradeoffs: a toast over the bar hides the exits (Quo). A toast above the bar floats mid-screen on short pages. The on-screen keyboard needs a test in the build (visual viewport handling); not researched.
- DrillMap fit: Linear's layout is the best match for the 12 px floating bar.

Researcher's recommendation: 1C. One bottom-center position for every screen. On student phones lift it above the tab bar (about 76 px + 8 px + safe-area inset) so it never covers the bar.

## 2. Does it close by itself, or stay until the student closes it?

### 2A. Stays until the student closes it
- Desktop web: [TIDAL](https://mobbin.com/screens/548b60c5-b45d-4ca9-81db-17875594fcd5) (explicit Close; persistence **inferred**, a still cannot show a timer), [Microsoft Loop](https://mobbin.com/screens/1c4378c0-b1bf-4fd6-8298-cb3b565d953a) (a dialog, not a toast: "Technical details", Copy, Close). Ref: [msloop](refs/msloop-error-dialog-copy-details.webp).
- [APG Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/): avoid alerts that disappear automatically. Vanishing alerts can fail WCAG 2.2.3.
- [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html): a time limit needs turn off, adjust, or extend (at least 20 seconds, up to ten times). A timed toast is exempt only if users can get the same information another way. The code exists only in the toast, so the exemption does not apply.
- Works when: the student needs time to act on the content (copy or read out a code).
- Tradeoffs: it can sit over content. It needs a reachable close control (keyboard, 44 px target).
- DrillMap fit: strong. No timer logic. Leaving the screen already closes it (flow map).
- Owner: —

### 2B. Auto-closes after a long delay, paused on hover and focus
- Libraries: [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast) (default 5000 ms, "Pauses closing on hover, focus and window blur"), [Sonner](https://sonner.emilkowal.ski/toast) (default `duration` 4000).
- Works when: the message is advice the student can see again another way.
- Tradeoffs: any timer is a 2.2.1 risk for a message whose code lives only here. Hover and focus pause does not help touch or screen-reader users. It repeats the NN/g 5 s failure.
- DrillMap fit: weak.
- Owner: —

### 2C. Success auto-closes, failure stays
- [Contra](https://mobbin.com/flows/e91f77ad-32f5-4839-b37f-da2adc6bc6dc) uses one card style for success and failure; the split is **inferred**. Success toasts are out of scope, so this is a note only.

Researcher's recommendation: 2A. Stay until the student closes it, with no timer.

## 3. How does the error code show: smaller text, a copy action, or neither?

### 3A. Smaller line, selectable
- Desktop web: [Posh](https://mobbin.com/screens/6561161d-a2f6-491d-ba69-e132d6d082e8) (code in brackets), [Snowflake](https://mobbin.com/screens/13748743-d3c9-4292-983d-f434f6083bb6) (ID in brackets in the same text). Refs: [posh](refs/posh-toast-error-code-bottom-right.webp), [snowflake](refs/snowflake-login-error-id.webp).
- Works when: the student reads the code aloud or retypes it. Monospace plus select-all-on-click covers it.
- Tradeoffs: NN/g says to show codes "for technical diagnostic purposes only", which a secondary line does. Without a button a phone student needs a long-press. Hex reads ambiguously aloud (`0`/`o`, `b`/`d`).
- DrillMap fit: strong. Caption text, no new component.
- Owner: —

### 3B. Code plus a Copy button
- Desktop web: [Microsoft Loop](https://mobbin.com/screens/1c4378c0-b1bf-4fd6-8298-cb3b565d953a) (Technical details with Copy), [Cloudflare](https://mobbin.com/screens/bbda00c4-4bde-48f2-91d0-a2414fdb5a24) (token field with Copy), [Mintlify](https://mobbin.com/screens/773c3d56-7b5b-4df3-ab2c-0ca63adb005d) (a "Copied" toast after copying). Refs: [msloop](refs/msloop-error-dialog-copy-details.webp), [cloudflare](refs/cloudflare-token-copy-panel.webp).
- Works when: the text is long or hard to select. An 8-character code is short.
- Tradeoffs: a second control in a small toast, next to a deliberately absent Retry. Its confirmation needs a status message. The clipboard API can fail silently. None of the examples is a failure toast.
- DrillMap fit: medium. If added, use an icon button whose label changes to "Copied", with no second toast.
- Owner: —

### 3C. No code on screen
- Fails the brief, which wants the student to read the code out.

Researcher's recommendation: 3A. A smaller monospace line, labeled "Error code", selected on one click or tap. Add Copy only if phone long-press proves unreliable.

## 4. What motion brings it in and out, and what is the reduced-motion version?

### 4A. Short rise from the bottom edge plus fade
- Stills show no motion. Library slide defaults are **inferred**; their exact numbers were not read.
- Works when: the toast comes from the edge where it sits.
- Tradeoffs: translation is movement and must drop under reduced motion.
- DrillMap fit: strong. 320 ms is for overlays; a toast is smaller, so 200 ms in and 120 ms out (a choice from the tokens, not a standard).
- Owner: —

### 4B. Fade only
- Posh, TIDAL and Mintlify stills show no offset; behavior is **inferred**.
- Works when: simplest build. It is also the reduced-motion version.
- Tradeoffs: no direction cue; easier to miss on a wide screen.
- DrillMap fit: strong as the reduced-motion state.
- Owner: —

### 4C. Scale or bounce
- Not recommended. A bounce signals play, wrong for a failure.

Researcher's recommendation: 4A with 4B as the reduced-motion version. See "Flow and motion".

## 5. A second failure comes while one toast shows: replace or stack?

### 5A. Replace
- [Material Components Android](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md): "Only one snackbar will be shown at a time. Showing a new snackbar will dismiss any previous ones first."
- Works when: the message is identical and only the code differs.
- Tradeoffs: a student mid-copy sees the code change. A double press loses the first code from the screen. The screen reader announces the new one, which is wanted.
- DrillMap fit: strong. One toast, one place, no layout shift on a long page.
- Owner: —

### 5B. Stack
- Desktop web: [Emergent](https://mobbin.com/screens/c97d67c5-54a4-4c02-89fb-4c6aa0b2ecd9) (two toasts stacked; one is a near-duplicate). Ref: [emergent](refs/emergent-stacked-toasts-bottom-left.webp).
- Works when: messages differ and each needs its own action.
- Tradeoffs: a double press makes two identical cards, the stack grows toward the tab bar, and each card adds a close control. [APG](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) warns that frequent interruptions make the timing criteria harder.
- DrillMap fit: weak.
- Owner: —

### 5C. Replace, but keep up to two codes in one toast
- No example found. Only worth it if support needs both codes. A new variant to design and test.
- DrillMap fit: medium.

Researcher's recommendation: 5A. Replace in place, and ignore an identical code arriving in the same second.

## 6. Does a later success on the same screen close the toast?

### 6A. Success closes it
- Real use: Material's "new snackbar dismisses the old one" rule means a success snackbar replaces a failure one ([docs](https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md)). [Contra](https://mobbin.com/flows/e91f77ad-32f5-4839-b37f-da2adc6bc6dc) shows error and success as separate frames; replacement is **inferred**.
- Works when: the failure was about the action the student just retried. The old message is now false.
- Tradeoffs: a student mid-copy loses the code when the retry works. A silent close (success messages are out of scope). A different action's success would also close it, which is wrong.
- DrillMap fit: strong if scoped to the same action.
- Owner: —

### 6B. Stays until closed
- Works when: the toast doubles as a record for support.
- Tradeoffs: a red failure next to a saved screen contradicts itself. Simple build, no coupling.
- DrillMap fit: medium.
- Owner: —

Researcher's recommendation: 6A. Close it when the same action succeeds. Leave it when a different action succeeds.

## 7. How does a screen reader hear it, once per failure?

### 7A. `role="alert"`, inserted at failure time
- [ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#alert): alert is "a type of live region with important, and usually time-sensitive, information", "a specialized form of the status role, which is processed as an atomic live region". [`aria-live="assertive"`](https://www.w3.org/TR/wai-aria-1.2/#aria-live) updates "should be presented [to] the user immediately".
- [APG Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/): alerts must not move keyboard focus. Screen readers do not announce alerts already on the page at load, so render them dynamically.
- [WCAG 4.1.3 Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): errors use `role="alert"`, "only necessary where a change of context does not take place". Focus need not move.
- Tradeoffs: a second failure must be a fresh node (new key) so the second code is announced. Keep the code inside the alert text so it is read once with the message.
- DrillMap fit: strong. Already the app's pattern, and focus stays on the screen's own button.
- Owner: —

### 7B. Persistent `role="status"` region
- [ARIA 1.2 status](https://www.w3.org/TR/wai-aria-1.2/#status): implicit `aria-live` of `polite` and `aria-atomic` of `true`; advisory, "not important enough to justify an alert".
- Works when: messages are advisory (success, "Copied").
- Tradeoffs: polite waits for a graceful moment, too quiet for a failure.
- DrillMap fit: medium. Use it only for a Copy confirmation, if Copy is added.
- Owner: —

### 7C. Move focus to the toast
- APG: alerts must not move focus; moving focus makes it an alert dialog, which is modal. [Radix](https://www.radix-ui.com/primitives/docs/components/toast) offers an F8 jump to the toast viewport and says it must be made discoverable.
- Tradeoffs: it steals focus from the button the student wants to press again.
- DrillMap fit: weak.

Researcher's recommendation: 7A. Keep `role="alert"`, insert after the failure, never move focus, one fresh key per failure. Put the close control after the text in tab order.

## 8. Which icon, which danger tokens, and does it use `shadow-e3`?

### 8A. Light card, danger icon, ink text, `shadow-e3`
- Desktop web: [Contra](https://mobbin.com/flows/e91f77ad-32f5-4839-b37f-da2adc6bc6dc) (white card, red outlined icon, red edge), [Snowflake](https://mobbin.com/screens/13748743-d3c9-4292-983d-f434f6083bb6) (light card, shadow, small red icon), [Descript](https://mobbin.com/screens/590f10a6-6225-4657-ba96-bbf7a7f1090e) (light card, close X, no error icon). Refs: [contra](refs/contra-error-toast-top-right.webp), [snowflake](refs/snowflake-login-error-id.webp).
- Works when: the app is light and the toast must not look like a button. Red lives in the icon and edge, so body text keeps contrast.
- Tradeoffs: a light card on a light page relies on its shadow. `shadow-e3` is the design system's answer.
- DrillMap fit: strong. `DESIGN.md` reserves `shadow-e3` for toasts. Icon and edge use `--color-danger` (dots and icons). Text uses `--color-danger-ink` or neutral ink. Contrast not measured.
- Owner: —

### 8B. Filled red card, white text
- Desktop web: [Dribbble](https://mobbin.com/screens/9abf2423-409d-4abb-9fdf-24d290062414), [Vercel](https://mobbin.com/flows/e308141d-c3cf-4838-a1cb-2e1927276c91), [ManyChat](https://mobbin.com/screens/12b11895-aadc-412b-857d-b816721ea111). Refs: [dribbble](refs/dribbble-error-toast-top-center.webp), [vercel](refs/vercel-error-toast-after-toggle.webp), [manychat](refs/manychat-error-toast-bottom-right.webp).
- Works when: the message must be seen at once.
- Tradeoffs: white text on `#F0524F` is probably low contrast (not measured). A loud red slab for a failure that is not the student's fault. `DESIGN.md` has no danger fill token.
- DrillMap fit: weak.
- Owner: —

### 8C. Dark neutral toast, small danger icon
- Desktop web: [TIDAL](https://mobbin.com/screens/548b60c5-b45d-4ca9-81db-17875594fcd5). Mobile: [Linear](https://mobbin.com/screens/3d9ccfd8-2425-49e9-a00b-27189140d3a3), [Qantas](https://mobbin.com/screens/18f77caf-19d5-4199-98b4-a36f34096d23).
- Works when: one neutral toast serves every type.
- Tradeoffs: the danger meaning then rests on the icon alone. NN/g says never to use color alone.
- DrillMap fit: medium. Needs a dark surface token that may not exist.
- Owner: —

Icon note: the light-card examples use a circle with an exclamation mark. A triangle (Dribbble) reads as a softer warning. Pair the icon with the words and mark it `aria-hidden`.

Researcher's recommendation: 8A. Light card on `shadow-e3`, circle-exclamation icon in `--color-danger`, message in neutral ink, code line in `--color-danger-ink`.

## Flow and motion

Mobbin stills cannot show motion. Anything marked **inferred** comes from where a toast sits in a frame, not from a recording.

| Step | Pattern | Timing | Basis |
| --- | --- | --- | --- |
| Appears | Rise 8 to 12 px from the bottom edge, fade in | 200 ms, `cubic-bezier(0.2, 0, 0, 1)` | Token choice; direction **inferred** from bottom placement in Posh, TIDAL, n8n, Wrangle |
| Stays | No timer | until closed, the student leaves the screen, or the same action succeeds | Questions 2 and 6; [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) |
| Closes | Fade out, 4 px drop at most | 120 ms, `cubic-bezier(0.4, 0, 1, 1)` | Token choice |
| Replaced | Old toast ends at once; new one fades in with no rise | 120 ms | Choice; avoids two toasts moving together |
| Reduced motion | No rise, no drop, fades only | 120 ms in and out | `DESIGN.md` reduced-motion rule |

- A community summary lists M3 emphasized easing as `cubic-bezier(0.2, 0, 0, 1)` ([source](https://davaux.codeberg.page/ui-docs/motion)). It is not a primary source.
- [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast) supports swipe to close. A swipe down is a natural extra way to close on a phone. Keep the close button for keyboard and screen-reader users.
- The element must exist with `role="alert"` at once. Only opacity and offset animate, so motion never delays the announcement.
- The 320 ms overlay duration is for modals and drawers, not toasts.
- No shake or flash. NN/g: never use animation alone to indicate an error.

## Sources not reached

- M3 snackbar and M3 easing and duration pages: script-rendered, only the title came back. The Material Components Android docs and a community motion summary were used instead.
- Apple HIG Alerts: the official page returned only its title. The sosumi.ai text mirror was read. Nothing on toasts or tab bars. An Apple tab-bar rule is not confirmed.
- NN/g: no toast article found. Baymard: no toast article found.
- Radix and Sonner pages: no reduced-motion note, stacking guidance, or ARIA role stated.
- ARIA 1.2 was read in parts. The implicit `aria-live` value of `alert` was not seen.
