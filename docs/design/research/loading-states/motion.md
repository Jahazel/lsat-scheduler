# Motion spec: Loading states

One set of motions to approve together. Each row is one transition from the brief's flow map. Durations use the project tokens in `src/app/globals.css`: fast (120 ms), base (200 ms). Curves use the project tokens `--ease-standard`, `--ease-out-strong` and `--ease-in-out-strong`.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Page placeholder | A nav tab, a link, a reload or a first sign-in opens a page that takes longer than 150 ms | Nothing for the first 150 ms. Then the grey shapes fade in. The header and tab bar stay still. | base, `--ease-standard`, after a 150 ms wait | Same fade, no change |
| Sweep band | The placeholder is on screen | One light band crosses the whole page from left to right, again and again, until the page arrives. Only the grey shapes brighten. | 1.6 s per pass, linear (constant motion) | No band. The shapes stay still. |
| Placeholder → page | The page is ready | The grey shapes fade out. The real page fades in and rises 8 px (4 px on a phone), section by section, top to bottom, 40 ms apart. Nothing changes position. | Shapes: fast, `--ease-standard`. Page: base, `--ease-standard`, 40 ms stagger | Shapes fade out. The page fades in with no rise and no stagger (fast). |
| Fast page | The page is ready in under 150 ms | No placeholder. The page fades and rises in, as above. | base, `--ease-standard`, 40 ms stagger | Fade in only (fast) |
| Back to a page the browser has kept | The browser's back button, or "← All weeks" and "← All students" when they go back | No placeholder. The page fades and rises in, as on a fast page. | base, `--ease-standard` | Fade in only (fast) |
| Progress list ↔ one week | Taps a week, "← All weeks", or the older and newer week buttons | Unchanged from #580: the old page dims to half and slides 8 px. If the next page takes longer than 150 ms, the Progress placeholder takes over with the band, then the handoff above. | Dim: fast, `--ease-out-strong` (the exit curve since #590). Then as above. | Dims without sliding |
| Button spinner | Taps a button that waits on the server (Save, Send, Sign out, Log in, Sign up, Continue) | The Ring fades and grows in from 90 % left of the label. The label changes to its wait text at once. The ring turns until the server answers. The button dims to 72 % and never gets narrower. | Enter: base, `--ease-out-strong`. Turn: 900 ms per turn, linear | A still ring that fades in (fast) |
| Reading bar | A screenshot read starts | The row opens to show the bar. A short segment, 36 % of the bar, slides across from left to right again and again. | Row opens: base, `--ease-standard`. Segment: 1.4 s per pass, `--ease-in-out-strong` | A still, faint full bar. The row opens without a transition. |
| Long read | A read runs past 10 s | "Still reading. This can take up to 30 seconds." fades in under the bar. The segment keeps sliding. | base, ease | Appears at once |
| Read done | The read returns rows | A full fill grows from the left under the segment, and the segment fades. Then "✓ 12 question types" replaces "Reading now", and the bar area closes. | Fill: base, `--ease-out-strong`. Segment: fast, ease. Result line after 260 ms. Close: base, `--ease-standard` | The bar is full at once. The result line replaces it with no wait. |
| Read failed | A read times out, cannot be read, or loses its connection | Connection lost: the segment stops in the middle of the bar and turns grey. Other failures: the bar goes away. The problem text and Try again appear. The bar never fills. | Row resize: base, `--ease-standard`. Border colour: base, ease | Same, without the row resize |

## Notes for the build

- **The placeholder fade-out uses `--ease-standard`.** When this was built, the exit token was an ease-in curve. #590 removed it, and the other fade-outs now use `--ease-out-strong`.
- **The row open and close animate the row's height** (`grid-template-rows`), not only `transform` and `opacity`. It happens once per read, and without it the rows below jump by the bar's height. There is no transform that gives the same result.
- **Only the shapes and the band move during a wait.** The nav, the tab bar and the page header never animate.
- **Feel-check on a real phone:** the 4 px rise, the band over white cards, and the reading segment at 390 px.
