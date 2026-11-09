# Design brief: Landing hero

Tracking ticket: #551

Rework of the hero section from the landing page design ([brief](../landing-page/brief.md), D3 · Product first). Owner feedback, 2026-11-03: the hero is "very plain, basic, too much open space" and needs new layout and motion. Only the hero changes. The sections below it stay as built.

## Job
A skeptical LSAT student lands on `/` from an ad. In the first screen they must see what DrillMap does (a Monday–Sunday plan built from their 7Sage analytics), see that it comes from a 178 scorer's method, and press "Start free week".

## Flow map
| From | User action | To |
| --- | --- | --- |
| Ad, search result, or link | Opens `/` signed out | Landing page, hero in view |
| Bookmark, signed in | Opens `/` | `/dashboard` or `/admin` (existing redirect, #448) |
| Hero | Taps "Start free week" (hero or top bar) | `/signup` |
| Hero | Taps "Log in" in the top bar | `/login` |
| Hero | Taps "How it works" or "Pricing" in the top bar | Same page, scrolled to that section |
| Hero | Scrolls down | The This week screen that peeks at the fold comes fully into view |
| Hero, phone | Swipes the card row | The next floating card slides into view |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Default, desktop | Visitor opens `/` at 1024 px or wider | Pill, headline, subtitle, button, no-card line, six floating cards, This week screen peeking at the fold over the spectrum glow |
| Default, tablet | 768–1023 px | Four cards: two in the top corners, two on the screen edges |
| Default, phone | Under 768 px | Three cards in one sideways-swipe row with position dots; full-width button |
| Load | First paint | Cards drift in once, then float |
| Reduced motion | System asks for reduced motion | Same layout; cards appear in place and stay still |

## Data cases
- Floating card text is sample study content, not the visitor's data. It must read as a real week: question type, drill count and minutes, a PT score change, a timed-section timer, days to test, weakest type.
- Sample values must agree with each other and with today's season (the September dates in the This week screen do not).
- Card text must fit at 200 px card width on phone.

## Out of scope
- Every section below the hero except How it works (Pricing, Questions, closing band, footer). Owner added How it works on 2026-11-03.
- Copy changes to the headline, subtitle, button, and no-card line.
- Dark-mode hero (H1c explored it; not chosen).

## Open questions
1. The four proof numbers (178, Stanford Law, 200+, 3,000+): H1 shows only the 178, in the pill. Do the other three stay in the row under the screen as built today? (Assumed yes: the current page already shows them below the hero screen.)
2. Which sample values go on the cards? (Placeholder: 158 → 165, 125 days to test, Flaw 4 of 10.)

## Directions
Built 2026-11-03 in Paper, "DrillMap · Design" → Explorations. Each is one 1440 px board with a phone-fit note. Exports: [directions/](directions/).

| Direction | Inspiration | One line |
| --- | --- | --- |
| H1 · Orbit | t3.codes | Centered headline with six tilted study cards floating around it; dot grid; This week screen peeks at the fold over the spectrum glow |
| H2 · Inline chips | Mobbin, Calendly | Icon tiles inside the headline words; product in a spectrum-gradient frame with icon tabs |
| H3 · Layered weeks | Zaro | Split layout with an isometric drawing of three stacked weeks and a full-width proof strip |
| H1b · Orbit with proof | H1 | Four cards become the proof numbers; no glow |
| H1c · Night orbit | H1 | Black ground, orbit rings, spectrum "Monday" |
| H4 · Fanned deck | H1 | Headline left; the week's cards fanned like a hand of cards |
| H5 · Week rail | H1 | Seven day cards hanging on a line under the headline |
| H6 · Collage | H1 | 150 px headline with a 178 sticker and cards tucked between lines |

**Chosen (owner, 2026-11-03): H1 · Orbit**, the original. The owner approved its desktop, tablet and phone boards the same day: [desktop](boards/h1-orbit-desktop-1440.png), [tablet](boards/h1-orbit-tablet-768.png), [phone](boards/h1-orbit-phone-390.png).

Critique (impeccable, degraded: single context, the detector cannot scan Paper boards):
- Strong: the cards fill the empty side space with real study content, so the hero is specific to LSAT prep.
- Weak: proof sits only in the small pill; the glow is close to the "gradient blob" anti-reference in PRODUCT.md; six cards may crowd a 1280 px laptop.

## Prototype
[prototype/index.html](prototype/index.html) switches between 1440, 768 and 390 px and turns reduced motion on and off. It renders [prototype/hero.html](prototype/hero.html). "Start free week" and "Log in" open a stand-in that names the real path; "How it works" and "Pricing" scroll to stand-in sections. Screenshots: [prototype/shots/](prototype/shots/).

Motion, chosen with `animate` (review: impeccable, degraded single context):

| Action | Motion |
| --- | --- |
| Page loads | Each card drifts in from its side (40 px, scale 0.96 → 1, fade), 600 ms (`--duration-reveal`), `--ease-out-strong`, 60 ms apart. Headline, subtitle and button do not move, so they can be read at once. |
| After the drift | Each card bobs 4 px up and down, 6 s per cycle, sine ease-in-out, each on its own phase. The bob pauses while the hero is off screen. |
| Scroll down (tablet and desktop) | Cards rise at different rates (60–160 px over the first 800 px of scroll) and turn up to 3°, so they read as a layer of depth above the screen. Tied to scroll position: CSS scroll-driven animation, linear. |
| Cursor comes near a card (mouse or trackpad only) | Within 200 px, the card leans up to 5 px toward the cursor, lifts 4 px, straightens a third of its tilt, grows to 101.5%, and its shadow deepens a little (owner asked for subtler, 2026-11-03). The pull ramps in gently from the edge. A spring (about 0.2 bounce) follows the cursor and settles back when it leaves. |
| Phone: swipe the card row | Native scroll snap. The active dot widens, 200 ms, `--ease-in-out-strong`. |
| Hover or press a button | Same as the landing page: color 120 ms ease (pointer devices only); press shrinks to 97%, 120 ms. |
| Reduced motion | No drift, no bob, no scroll depth, no cursor pull, no press shrink, no dot slide. Cards sit in place. |

Token note: the bob uses easeInOutSine (`cubic-bezier(0.37, 0, 0.63, 1)`), which the project does not have. `--ease-in-out-strong` would snap at each end of a slow loop.

Owner asked for scroll and cursor-nearness card motion (2026-11-03); added to the prototype the same day.

## How it works: pinned scroll story (added 2026-11-03)
Owner request: as the visitor scrolls, the step text and the screen change in place. Owner reference: [Mobbin section](https://mobbin.com/sites/sections/3ffb4e40-3d9e-4f66-adb7-b04bc5a831cb). The Mobbin tool cannot open a section by its link, so the reference was not seen; the pattern is built from the owner's description. Copy and screens are the built ones from `src/components/landing/HowItWorks.tsx`.

| Width | Layout |
| --- | --- |
| Desktop (1024 px and up) | The section pins right under the top bar, sized to its content (no full-screen band), for about 2.5 screens of scroll. The step text lines up with the top of the screen. Left: "Four steps. The last one repeats every weekend.", the step count ("Step 02 / 04"), the step title and text, and the four-part progress bar. A step list was tried in place of the bar; the owner asked for the original instead (2026-11-03). Right: the step screen on its color panel (violet, pink, amber, spectrum). |
| Tablet (768–1023 px) | Same pin, one column: text and progress bar above, screen below. |
| Phone (under 768 px) | No pin. The four color panels stack, as built today. |

| Action | Motion |
| --- | --- |
| Scroll into the next quarter of the section | The step changes. The old text fades out in 120 ms and moves 14 px up. The new text fades in over 200 ms (80 ms later) and rises 14 px over 320 ms (`--duration-slow`), `--ease-out-strong`. The old screen fades out over 320 ms and moves 28 px up while the new screen rises 28 px from 98% size over 600 ms. The color panel crossfades over 600 ms. Scrolling back reverses the direction. |
| Scroll inside a step | The bar for that step fills with scroll position (linear, no easing). |
| Tap a progress-bar part | The page scrolls smoothly to that step. |
| Reduced motion | The same pin and swap. Things only fade, over 120 ms, with no movement; the bar jump scrolls at once. |

Screen readers get all four steps as one ordered list. The swapping panel is hidden from them.

Text, revised 2026-11-03 (owner: "the color and hierarchy feels off"; reference: a quiet label, one medium-weight title, a light gray body):
- Three levels only. Label: 15 px, weight 500, ink; the count is 13 px Geist Mono, fog. Title: 30 px, weight 500, ink. Body: 17/27 px, weight 400, #6B6B6B (about 5:1 on vellum), at most 380 px wide.
- The key phrase of each title gets a 3 px underline in its panel color: "your prep" violet, "7Sage analytics" pink, "your week" amber, "every weekend" the full spectrum. It draws in from the left, 600 ms, `--ease-out-strong`, 240 ms after the title arrives; with reduced motion it is simply there. (A ring was tried first; the owner found it too close to the reference.)
- The progress bar is 2 px.
- The first build showed the body in bold by mistake: it reused a class name from the hero cards. Fixed.
- The line "Four steps. The last one repeats every weekend." shows at the top of the pinned block on desktop and tablet (owner, 2026-11-03), and above the stacked steps on phone.
- Short windows: the screen shrinks to fit the window height, and the pinned block has 56 px (desktop) or 40 px (tablet) of space above and below. Before this fix, a short tablet window pushed "How it works" under the top bar (owner report, 2026-11-03). Checked at 768×640, 768×820 and 1280×680.
- Spacing (owner: "too separated from the hero", 2026-11-03): the pinned block is only as tall as its content, so no empty band shows above it when it scrolls in or below it when it lets go. The gap from the hero screen to "How it works" went from about 400 px to 144 px at 1440 × 900.
- Empty space while pinned (owner, 2026-11-03): the pinned block now sits centered in the window instead of at the top, while still scrolling in right after the hero. The step list makes the text column about as tall as the screen. At 1440 × 900: 176 px above, 176 px below. Note: the viewer shows the 1440 frame scaled down, so its frame is far taller than a real 1440-wide laptop window and shows more empty space than a visitor will see.

### Section grid (owner reference: Profound, 2026-11-03)
The owner's first Mobbin link could not be opened, so a left-edge line with dots was tried first; the owner rejected it and sent screenshots of Profound's page instead. Built from those screenshots:
- Below the hero, faint dashed column guides (ink at 11%) run down the page: both content edges plus three lines inside, so four equal columns, aligned to the 1120 px content width (720 px on tablet). Phone keeps only the two edge lines.
- Between sections there is a 128 px gap (56 px on phone) where only the guides show, and a darker dashed line (ink at 40%) runs down the middle as the connector.
- Each section opens with a full-width solid rule, then a Geist Mono 13 px label, "[02] How it works" and "[03] Pricing", with a dashed rule under it. The bracket number is fog and hidden from screen readers; the name is ink and is the section's heading.
- Inside How it works, the pinned block now shows "Step 02 / 04" above the title; the label row above it scrolls away as the pin takes over.
- The hero's bottom padding went from 96 px to 48 px, since the gap band now carries the spacing. The guides start under the hero, so its dot grid and cards stay clean.
- Open: the real page has Questions, a closing band and a footer below Pricing. Those were out of scope; each would need the label row and the gap band.
- Hierarchy (owner: "tweak the hierarchy so that it makes more sense", 2026-11-03): the pinned text now reads as two groups. Section intro: 15/22 px, smoke, with a dashed rule under it (24 px below the text, 32 px above the step). Step: count in 12 px Geist Mono caps, fog, 12 px above the 30 px title; then the body, and the progress bar.

## Pricing: iteration 1 (added 2026-11-03)
Owner request: an iteration of Pricing "based on what we have so far". Pricing was out of scope until now. Copy is unchanged from `src/app/page.tsx` and `src/lib/planPrices.ts`. Shots: [1280](prototype/shots/pricing-1280.png), [768](prototype/shots/pricing-768.png), [390](prototype/shots/pricing-390.png).

| Width | Layout |
| --- | --- |
| Desktop | The section sits on the four guide columns. Heading on columns 1–2, with "first full week" underlined in the full spectrum. Subtitle on columns 3–4. (A Mon–Sun strip in spectrum colors sat above the subtitle; the owner removed it, 2026-11-03.) Each plan is two columns wide, so its edges sit on the guides, between dashed rules. Monthly sits on the spectrum panel from How it works step 4; Weekly is plain. Plan name is a mono caps label, price 56 px. The cancel line sits under the plans. |
| Tablet | Same, one column for the heading block; plans stay side by side. |
| Phone | Plans stack. Monthly keeps a 12 px spectrum frame. |

| Action | Motion |
| --- | --- |
| Pricing scrolls in (a quarter on screen) | Once per visit. Heading, subtitle, each plan and the cancel line fade in and rise 16 px, 600 ms (`--duration-reveal`), `--ease-out-strong`, 80 ms apart. The key phrase underline draws in from the left, 600 ms, after 360 ms. |
| Pointer over a plan card (mouse or trackpad only) | The card rises 2 px, its border darkens a little (Monthly keeps no border), and a soft shadow fades in. 200 ms, `ease`. Owner asked for a slight, minimal hover (2026-11-03). Reduced motion: no rise; the border and shadow still change. |
| Reduced motion | Fade only, 120 ms. The underline is simply there. |

- Best value badge (owner, 2026-11-03): solid ink with chalk text, like the buttons. The pastel spectrum gradient is gone.

### How it works: tablet screen size (owner, 2026-11-03)
Owner: the tablet screen was too small to read. It shrank to fit short windows, so at about 760 px tall it was only about 290 px wide. Now the screen always fills the column (672 px at 768). A short window crops the bottom of the screenshot instead of shrinking it: 190 px tall at 640, 302 px at 760, the full 430 px at 1024. The pinned block still fits between the top bar and the bottom of the window at all three heights. Shot: [768 × 760](prototype/shots/how-tablet-768x760.png).

- Sharp screens (owner: "you can tell that it's zoomed in", 2026-11-03): the four desktop and tablet step images were 1x crops (678 × 435 and 780 × 500 px). Stretched to 672 px on a 2x screen, they looked blurry. They are now 2x crops (1356 × 870 and 1560 × 1000 px). Source: the vector app boards on Paper's Approved page ("Step 1 · Goal (1a.3)", "Step 4 · Review (4d)", "Dashboard (12a · Check-off, tutor feedback)", "Weekly upload · empty (13a)"), exported at 2x and cut with the same crop as the landing board's 624 × 400 screen frames. Each new crop, scaled back down, matches the old image within about 3 of 255 per pixel. The live page's `public/landing/step-*.png` files are the same 1x images, so the build ticket must swap them too. The hero's This week image (`this-week.png`, 1440 px shown at 1120 px) is also below 2x.

## Questions: iteration 1 (added 2026-11-03)

Owner references: Legend (numbered rows, square +/- button, dashed row rules, list on the right guides) and Aave (title beside the list). The copy is the live page's five questions, unchanged.

| Part | Choice |
| --- | --- |
| Label row | `[04] FAQ`, same as the other sections. Title "FAQ" (owner, 2026-11-03; the live page says "Questions"). |
| Layout | Desktop: title on guide column 1 (sticky while the list scrolls), list on columns 2–4, so each row starts on a guide. Tablet and phone: title above the list. |
| Row | Mono `Q01`–`Q05`, question 20/28 medium, square 32 px icon button on the right. Dashed rule between rows. |
| Open state | Every question closed on load. One row open at a time: opening a row closes the open one. The open row's button turns solid ink with a minus. |
| Open motion | Answer: grid rows 0fr → 1fr plus opacity, 200 ms strong ease-out (same as the live QuestionList). Plus icon: the vertical bar scales to 0. Reduced motion: opacity only, 120 ms. |
| Hover | Pointer devices only: question text goes to smoke and the icon border darkens, 200 ms ease. |
| Reveal | Once, at 20% in view: title, then rows with a 60 ms stagger, 600 ms strong ease-out, 16 px rise. Reduced motion: opacity only. |

Screenshots: [desktop](prototype/shots/questions-1440.png), [phone](prototype/shots/questions-390.png).

## Closing band: option D (added 2026-11-03)

Options A (plain), B (hero dots), C (sunrise panel) and D (split) are side by side in `prototype/cta-options.html`. The owner chose D, from their Stripe "Ready to get started?" reference, and it is now in `hero.html` with a dark footer stub.

| Part | Choice |
| --- | --- |
| Label row | `[05] Start`. |
| Layout | Desktop: the ask on guide columns 1–2, left aligned; two signposts on columns 3 and 4. Tablet: ask on top, signposts side by side. Phone: all stacked, buttons full width. |
| Ask | Live headline, the no-card note, Start free week (black, with an arrow) and Log in (white, bordered). |
| Signposts | Icon tile (violet price tag, pink repeat arrows), title, one line, link to `#pricing` or `#how`. |
| Hover | Pointer only: the link arrows nudge 2 px right; Log in's border darkens; 120 ms ease. Reduced motion: no nudge. |
| Reveal | Once, at 25% in view: ask, then signposts 80 ms apart, 600 ms strong ease-out, 16 px rise. Reduced motion: opacity only. |

New copy waiting for the owner's OK: "Start" label, "See what you'll pay" / "Pricing", "See how it works" / "How it works", the Log in button, and the signpost lines. Screenshots: [desktop](prototype/shots/close-1440.png), [phone](prototype/shots/close-390.png).

### Hero: proof pill removed (owner, 2026-11-03)

The "Built from a 178 scorer's coaching method" pill is gone from the hero. The headline keeps its old position (the copy's top padding grew by the pill's height plus its gap), so the cards, glow and screen do not move. The Paper hero boards still show the pill; the state boards in step 6 drop it. [Screenshot](prototype/shots/hero-no-pill-1440.png).

### Hero: new headline and line, no 7Sage (owner, 2026-11-03)

DrillMap will support more practice sites later, so the hero no longer names 7Sage. The owner chose:
- Headline: **Your practice results, turned into next week's plan**
- Line: **Upload your analytics every weekend. DrillMap builds Monday to Sunday around the question types you miss most.**

The headline now runs three lines on desktop and tablet, so `h1` gets `text-wrap: balance` ("Your practice / results, turned into / next week's plan") and tablet gives back the pill's 50 px above it, so the button clears the lower cards. Phone: four lines. 7Sage still appears in How it works step 2 and the FAQ; the owner has not decided those yet.

### Hero: sharp This week screen (owner, 2026-11-03)

The owner said the hero screen "looks screenshotted". `this-week.png` and `app-nav.png` were 1x (1440 px) images shown at 1118 px. They are now 2x exports of the same Paper boards ("Dashboard (12a · Check-off, tutor feedback)" for the page, "Weekly upload · empty (13a)" for the top bar): 2880 × 3094 and 2880 × 144 px. Scaled back down, each matches the old image within about 1 of 255 per pixel. Shown size is unchanged. The live page's hero image needs the same swap in the build ticket.

### Owner answers before the spec (2026-11-03)

- **State boards:** the prototype and its screenshots stand in for Paper state boards. The Paper H1 boards stay on Explorations as history and are not moved to Approved.
- **Closing band copy:** approved as in the prototype: `[05] Start`, "See what you'll pay" → Pricing, "See how it works" → How it works, the white Log in button, and the signpost lines.
- **7Sage outside the hero:** How it works step 2 becomes "Upload your practice analytics" (the underlined key phrase is "practice analytics"). The FAQ question becomes "Which practice sites work?", answer "7Sage today, with more sites coming. You can also type your numbers by hand."
- **Proof numbers:** no proof row. The live `PROOF_NUMBERS` row is removed with the pill.
- **Sample dates:** keep the September dates on the app screens.
- **Hero screen crop:** keep the approved crop and size.
- **Pricing, FAQ, closing band critique:** skipped; the owner approved the prototype.
- Scope note: "Out of scope" above is replaced. The redesign now covers every section on the page except the footer, which stays as built (the prototype's dark footer is a stub).
- Motion: [motion.md](motion.md).
- **Hero tab switch:** removed, as prototyped (owner, 2026-11-03). The hero shows only the This week screen; the Progress screen leaves the page.
