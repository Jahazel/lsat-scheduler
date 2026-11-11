# DrillMap logo kit

Mark: Joined route + "DrillMap" in Geist SemiBold (outlined, no live text).
Colours: Void Eclipse #0B0B0B · Abyss Blue #2B3B79 (end square, light grounds only) · Silver Mist #E4E4E4 (reversed).

## svg/
- drillmap-horizontal.svg — primary lockup (also -black, -reversed, -currentcolor for inline React use; accent via --logo-accent)
- drillmap-stacked.svg / -reversed — stacked lockup (not used on the site: the owner chose no logo on the Log in glow, 2026-11-11)
- drillmap-symbol.svg / -black / -reversed — the mark alone, 32 px and up
- drillmap-symbol-small.svg / -small-reversed — 16–31 px cut: solid start dot, thicker line (also -small-currentcolor for inline React use; accent via --logo-accent)
- drillmap-wordmark.svg / -reversed — name only

## web/
- favicon.ico (16/32/48), favicon.svg (switches to Silver Mist in dark mode), favicon-16/32/48.png
- apple-touch-icon.png (180), icon-192.png, icon-512.png, maskable-512.png — Void Eclipse tile, Silver Mist mark
- site.webmanifest, head-snippet.html

## Next.js placement (app router file conventions)
- src/app/favicon.ico ← web/favicon.ico (replaces the current one)
- src/app/icon.svg ← web/favicon.svg
- src/app/apple-icon.png ← web/apple-touch-icon.png
The head snippet is not needed in Next.js; the file conventions add the tags.

## Notes
- Geist is under the SIL Open Font License, which allows logo use.
- Trademark clearance is not done. Run a search before launch.
