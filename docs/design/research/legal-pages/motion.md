# Motion spec: legal pages

One row per flow-map path and per moving part. The rows are one set, approved together. Durations and curves are the
project's tokens: `--duration-fast` (120 ms), `--duration-base` (200 ms), `--ease-standard`, `--ease-out-strong`.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Legal page | Opens from the site footer, a sign-in or sign-up legal link, the page switcher, a text link, or browser Back | The existing page arrival (#586): sections fade in and rise a few pixels, in order, at the top of the page | `--duration-base`, `--ease-standard` | Fades in without rising, `--duration-fast` |
| Legal page at a section | Opens from a shared section link (`/legal/terms#cancelling-and-refunds`) or the AI disclosure "Related" list | Same page arrival, already scrolled so the heading sits just under the site header (and the mobile "On this page" bar); no scroll motion. The list marks that section. | `--duration-base`, `--ease-standard` | Fades in without rising, `--duration-fast` |
| Legal page with an unknown section link | Opens with `#unknown` | Same as opening at the top; no error | `--duration-base`, `--ease-standard` | Fades in without rising |
| Page text | Reader taps a section in the "On this page" list | Smooth scroll to the section; the address shows the section link; focus moves to the heading | Browser smooth scroll | Jumps without scrolling |
| Section marker (desktop list) | The section being read changes (scroll or tap) | The thin bar slides and resizes to the new item in one transform | `--duration-base`, `--ease-out-strong` | Moves without animation |
| "On this page" bar (below 1024 px) | Reader opens or closes the list | The list fades in and drops 4 px from under the bar; the arrow turns over. Interruptible. | `--duration-base`, `--ease-out-strong` | Shows and hides without animation |
| "On this page" bar title | The section being read changes | Title text changes in place | None | None |
| Copy-link button | Pointer moves over a heading (mouse only) | Link icon fades in | `--duration-fast`, `ease` | Same (opacity only) |
| Copy-link button | Reader taps it | Link icon shrinks out as the check grows in; "Copied" (or "Couldn't copy") slides in 2 px; returns after 1.6 s | `--duration-fast`, `--ease-out-strong` | Icons swap without animation; label appears without sliding |
| Page switcher, text links, "Related" links | Pointer hovers (mouse only) | Colour or underline darkens | `--duration-fast`, `ease` | Changes without animation |
| Controls on touch | Finger presses a switcher tab, list item, "On this page" bar, or "Related" link | Instant press state (darker text or lower opacity); no grey tap flash | None | Same |
