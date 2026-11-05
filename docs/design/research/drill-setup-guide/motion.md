# Motion spec: Drill setup guide

One set of motions to approve, not options. Durations use the project tokens only: `--duration-fast` (120 ms) and
`--duration-base` (200 ms). The curve is `--ease-out-strong`, cubic-bezier(0.23, 1, 0.32, 1). The `--ease-exit` token
is an ease-in curve, which the motion rules forbid for UI, so no row uses it.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| "Set up" text | Pointer on it (mouse only) | Text darkens to ink; the row does not shade | Fast, ease-out | Same (color only) |
| "Set up" text | Press | Scales to 0.97 | Fast, ease-out-strong | No scale |
| Drill row | Click the row (not "Set up") | Unchanged: the existing done toggle | Existing | Existing |
| Guide | Opens from "Set up", or from a link on load | Backdrop and guide fade in; the card scales 0.96 → 1 from the center | Base, ease-out-strong (scale), ease-out (fade) | Fade only, no scale |
| Guide | Closes: close button, Escape, Done, click on the dimmed week, browser Back | Fade out; the card scales 1 → 0.96. Focus returns to "Set up" after it ends | Fast, ease-out-strong (scale), ease-out (fade) | Fade only, no scale |
| Card content (screenshot, step count, title, text, filters or "Open 7Sage drills") | Next step, Back, a dot, or an arrow key | New content fades in and moves 12 px from the side the student moves to: from the right for Next or a later dot, from the left for Back or an earlier dot. The step column starts 40 ms after the screenshot. The old content leaves at once. The card, header and buttons stay still | Base, ease-out-strong | Fade only, no movement |
| Card content | Held arrow key (key repeat) | No motion: the card changes at once | None | None |
| Current dot | Card changes | Changes width and color at once (no width animation) | None | None |
| Screenshot | Click or tap to zoom, and to fit back | No motion: the area switches to real size and scrolls | None | None |
| Buttons in the guide (close, Back, Next step, Done, Open 7Sage drills) | Press | Scale to 0.97 | Fast, ease-out-strong | No scale |
| "That drill is not in this week" notice | A link names a drill not in this week | No motion: shown on load | None | None |
| "Open 7Sage drills" | Click | No motion: 7Sage opens in a new tab; the guide stays open | None | None |

Notes:

- Every hover style applies only to a mouse (`hover: hover` and `pointer: fine`), so a tap on a phone does not leave a
  hover color behind.
- The guide is a modal, so it scales from the center, not from "Set up".
- The open (200 ms) is slower than the close (120 ms): the student is waiting to read, and leaving should be quick.
