# Motion spec: admin dashboard

One set of motions to approve, not options. Durations use the project tokens: Fast is `--duration-fast` (120ms), Base is `--duration-base` (200ms). Every curve is `--ease-out-strong` unless the row says otherwise. Closing and hiding are instant.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Any button or tab | Press | Shrinks to 97% while held | Fast | Color change only, no shrink |
| Admin / Student switch | Taps the other side | The white pill slides to that side (`--ease-in-out-strong`) | Base | Pill jumps, no slide |
| Admin page or tab | Taps Students, Schedule lab, a student row, ← All students | The new page fades in | Fast | Same fade |
| Student detail tab | Taps This week, Past weeks, Progress, or Settings & tests | The tab content fades in | Fast | Same fade |
| Past weeks or Progress row | Taps a week | Its chevron turns 90° | Fast | Chevron turns with no motion |
| Students filter or sort menu | Taps the menu | Grows from the button: 96% to 100% with a fade | 160ms (menu value, between Fast and Base) | Fade only |
| Avatar menu | Taps the avatar | Grows from the avatar's top-right corner: 96% to 100% with a fade | 160ms | Fade only |
| Schedule lab week | Taps Next week → or ← Earlier week | The week slides 12px in from that side with a fade | Base | Fade only |
| Schedule lab screenshot slot | A file is being read | The slot pulses until the read ends | Tailwind pulse | No pulse |
| Walkthrough card | Taps the date in the switch | Grows from the switch's top-right corner: 96% to 100% with a fade | 160ms | Fade only |
| Walkthrough card | Taps outside, ×, Escape, or the date again | Closes at once | None | Same |
| Date in the switch and the card title | A move finishes | The new date rises 4px into place with a fade | Base | Fade only |
| "Moved to …" notice, Start over confirmation | A move finishes, or Start over is tapped | Drops 4px into place with a fade | 160ms | Fade only |
| Pick a day | Taps Pick a day | The calendar drops 4px in with a fade; the chevron turns 180° | 160ms, chevron Fast | Fade only; chevron turns with no motion |
| Real student page | A move or a tab reloads it | Hides at once while it loads, then fades in | Fast | Same fade |
| Real student page (onboarding, upload, This week) | Any step inside it | The live app's own motion, unchanged | Live tokens | Live rules |
