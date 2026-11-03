# Motion spec: Landing page

Approved by the owner with the prototype, 2026-11-02 ([prototype](prototype/index.html), [video](prototype/shots/motion-1280.mp4)). Each row was chosen with `animate` and reviewed with `impeccable`. Tokens are from `src/app/globals.css`.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Buttons and links | Hover (mouse or trackpad only) | Background or text color changes; `ease` | `--duration-fast` (120 ms) | Color changes at once |
| Buttons | Press | Shrinks to 97% and back; `--ease-out-strong` | `--duration-fast` (120 ms) | No shrink |
| Page | Tap "How it works" or "Pricing" in the top bar | Smooth scroll; the section top stops under the 64 px top bar. Step screens the jump passes appear without their wipe. | Browser smooth scroll | Jumps at once |
| Hero tab pill | Switch "This week" / "Progress" (click, arrow keys, Home, End) | White pill slides to the chosen tab; its label moves with it; `--ease-in-out-strong` | `--duration-base` (200 ms) | Pill moves at once |
| Hero screen | Same tab switch | Old screen fades out while the new one fades in; `--ease-out-strong` | `--duration-base` (200 ms) | Fade stays, `--duration-fast` (120 ms) |
| Question answer | Open or close a question | Answer grows or shrinks in height and fades; `--ease-out-strong`. Other questions do not change. Closed answers are hidden from screen readers. | `--duration-base` (200 ms) | Height changes at once; fade stays, `--duration-fast` (120 ms) |
| Question icon | Same | Plus turns to minus: the vertical bar shrinks to nothing | `--duration-base` (200 ms) | Changes at once |
| How it works step screen | First scroll into view | Wipes up from the bottom once; `--ease-out-strong` | 600 ms, no token (see note) | Screen is shown at once |
| Top bar | Page scroll | None. It is sticky from the start and looks the same after scroll. | — | Same |
| Page | "Start free week", "Log in", Terms, Privacy, AI disclosure | None. The next page opens at once. | — | Same |
| Any control | Keyboard focus | 2 px ring appears at once: Accent on light ground, Chalk on the dark footer | — | Same |

## Token notes
- `--ease-in-out-strong` (`cubic-bezier(0.77, 0, 0.175, 1)`) is new. The tab pill needs an ease-in-out curve because it moves across the screen.
- The step-screen wipe is 600 ms, longer than `--duration-slow` (320 ms). It plays once per screen on a marketing page, as an explanation of each step. The build needs a new token, such as `--duration-reveal: 600ms`.
- `--ease-exit` (`cubic-bezier(0.4, 0, 1, 1)`) is an ease-in curve. The motion rules ban ease-in curves for interface motion, so nothing here uses it.
