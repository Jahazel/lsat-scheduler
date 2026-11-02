# Motion spec: Study settings

The owner approved this motion in the prototype on 2026-11-01 (`prototype/index.html`).

Durations are the design-system tokens: fast 120 ms, base 200 ms, slow 320 ms. Easings: standard `cubic-bezier(0.2, 0, 0, 1)` for entrances; strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for exits. The project's exit curve `cubic-bezier(0.4, 0, 1, 1)` is an ease-in, which the `animate` rules forbid on UI, so this page does not use it. Reduced motion follows the design system: drop movement, keep 120 ms fades.

Only `opacity` and `transform` animate, through CSS transitions, not keyframes. A new trigger retargets a running transition instead of restarting it. Field errors, the passed-month notice, and the loading state do not animate: they appear at once, so motion never delays what the student must read. Status text uses `role="status"` or `role="alert"` from the first frame.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Save bar | The first edit makes the page unsaved | Rises 12 px from below and fades in, standard curve | Base, 200 ms | Fades in without movement, 120 ms |
| Save bar | The student undoes every edit, so the page is clean again | Fades out and drops 12 px, strong ease-out | Fast, 120 ms | Fades out without movement, 120 ms |
| Save bar button | Student presses "Save changes" | Label changes to "Saving…" in place; button dims to 60 % opacity | Fast, 120 ms | Same |
| Save bar message | The save succeeds | Note crossfades to "Saved. Changes apply to your next weekly schedule."; the button fades out | Fast, 120 ms | Same |
| Save bar | 6 s after "Saved." shows | Same as the clean exit | Fast, 120 ms | Same as the clean exit |
| Save bar | A new edit during the 6 s "Saved." hold | Message crossfades back to the note; the button fades in; the bar stays put | Fast, 120 ms | Same |
| Failure toast | The save fails | The app's failure toast enters as in `docs/design/research/failure-toast/motion.md`. Its slot sits 88 px higher on phone and 80 px higher from 768 px while the bar shows, leaving 24 px between toast and bar, so it stacks above the bar | Base, 200 ms | As in the failure-toast spec |
| Failure toast slot | The bar hides or shows while a toast is open | Slot moves by 88 px on phone or 80 px from 768 px with `transform`, standard curve | Base, 200 ms | Jumps, no movement |
| Field errors | Save pressed with invalid input | No motion on the messages. The page scrolls the first invalid field to the center with smooth scroll, then focus moves there | Browser smooth scroll | Instant scroll |
| Attempt row | Student presses "Add attempt" | New row fades in and drops 6 px into place; focus moves to its score | Base, 200 ms | Fades in without movement, 120 ms |
| Attempt row | Student presses "Remove attempt" | Row fades out, strong ease-out, then the list closes the gap at once | Fast, 120 ms | Same |
| Preview bar (desktop only) | A day's time or the practice-test day changes | Bar scales on the x axis from the left edge, strong ease-out; the changed day turns accent | Fast, 120 ms | No movement; the value changes at once |
| Leave dialog | Student picks another tab with unsaved edits | Scrim fades in; dialog scales from 0.96 to 1, standard curve; focus moves to Stay | Slow, 320 ms | Both fade in without scaling, 120 ms |
| Leave dialog | Student presses Stay or Escape | Scrim fades out; dialog scales to 0.98, strong ease-out; focus returns to the tab pressed | Fast, 120 ms | Fades out without scaling, 120 ms |
| Leave dialog | Student presses Leave | Same exit as Stay, then the app goes to the chosen tab | Fast, 120 ms | Same as Stay |
| Test time control | Student picks Standard, 1.5× time, or 2× time | Selected background and text color change | Fast, 120 ms | Same |
| Nav tabs | Hover, fine pointer only | Background to Vellum | Fast, 120 ms | Same |
| Remove button | Hover, fine pointer only | Background to Vellum | Fast, 120 ms | Same |
| Passed-month notice | The page loads with a passed month | No motion; it is there from the first frame | None | None |
| Loading | The page fetches settings | The app's existing loading state (`src/app/loading.tsx`, Tailwind `animate-pulse`). Nothing new | As in the app | As in the app |
| Page content | Any of the above | Nothing shifts layout except Add and Remove attempt; the bar floats over the page | None | None |
