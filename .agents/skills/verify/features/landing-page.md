# Landing page

Entry points: a signed-out visit to `/`, and a signed-in visit to `/`.

- `landing-sections`: open `/` signed out at 1440, 768 and 390 px wide. Expect the `Your LSAT week, planned before Monday` heading, the four proof numbers (`178`, `Stanford Law`, `200+`, `3,000+`), the `Your first full week is free` region with `id="pricing"`, the `Weekly` and `Monthly` plan cards, the cancel line, and the `Get next week's plan from your own analytics` closing band. Require `document.documentElement.scrollWidth <= innerWidth` at each width. At 390 px the plan cards stack in one column.
- `landing-start`: every `main >> role=link[name="Start free week"]` has `href="/signup"`. Click the first one and expect the `Sign up for DrillMap` heading.
- `landing-prices`: the Monthly card shows `Best value · about 28% less` and `About $34.60 a month on Weekly`. Both come from `src/lib/planPrices.ts`; a long-price check edits `PLAN_PRICES` there in the working tree only, reloads, and reverts the edit.
- `landing-hero-tabs`: at each width, the `Inside the app` tab list has `This week` (selected) and `Progress`. Click `Progress`, then press `ArrowLeft`, `End` and `Home` on the focused tab; the one `aria-selected` tab and the visible `tabpanel` image's alt text follow. Read the `[data-testid="hero-tab-pill"]` `clip-path` about 80 ms after a click: it is between the two tabs while it slides. With `page.emulateMedia({ reducedMotion: "reduce" })` the pill's transition is `none` and the panel fade is 0.12 s. The screen images are served from `public/landing/`; a failed `/_next/image` request there means the proxy matcher stopped skipping that folder.
- `landing-signed-in`: seed a student, sign in with `signInAs`, open `/`, and expect `/dashboard`.

For PR pictures, scroll each section into view and take a screen-sized `page.screenshot`.
