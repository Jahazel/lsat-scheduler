# Findings: Progress

Brief: [brief.md](brief.md). Tracking ticket: #334.

Example screens are in [refs/](refs/), named `<question>-<app>-<short>.png`. Mobbin shows still frames only, so every motion read from Mobbin is marked **inferred**.

Mark each pattern on its `Owner:` line: like, dislike, or leave it blank.

DrillMap fit is judged against the design system folder `docs/design/design-system/`: the CSS variables file, the foundations board, and the This week patterns board. Its motion tokens are `fast` 120 ms, `base` 200 ms, and `slow` 320 ms. The standard easing is `cubic-bezier(0.2, 0, 0, 1)`, and the exit easing is `cubic-bezier(0.4, 0, 1, 1)`. Reduced motion drops movement and keeps 120 ms color and opacity fades. `07-this-week-patterns` already says a past week keeps its marks and loses the check-off control and hover.

## 1. How should the week list read at a glance: rows, cards, or a compact calendar-style grid of weeks?

### 1A. Plain rows in one list
- Apps: [MacroFactor](https://mobbin.com/screens/8d35cd72-9428-4d6d-8466-5748f8840198), [Bevel](https://mobbin.com/screens/2c8bd560-dba7-420d-acee-4c2a5443d010), [Monarch](https://mobbin.com/screens/5e408508-0a7e-42d0-8fe4-879ab707bbc1), [PayPal](https://mobbin.com/screens/64c0ed49-09e6-4881-a421-04f12f85a542). Refs: `1-macrofactor-grouped-rows.png`, `1-bevel-rows.png`.
- Works when: there are many items, and each item shows the same two or three facts.
- Tradeoffs: it is plain and gives little visual reward.
- DrillMap fit: strong. Today's Progress rows already use this shape, so it needs no new component.
- Owner:

### 1B. One card per week
- Apps: [Nike Run Club](https://mobbin.com/screens/c20a7fbc-a50f-4f54-8d4f-4fec4bf84ca1), [Apple Fitness](https://mobbin.com/screens/3f697e63-4a88-41b8-afb6-fdb4207ecb1e), [Runna](https://mobbin.com/screens/e52cd6c6-6db9-412e-8391-5172d3274048). Refs: `1-nikerunclub-month-cards.png`, `1-applefitness-month-cards.png`.
- Works when: each item carries a picture or several facts.
- Tradeoffs: each card is 80 to 120 px tall, and most of it would be empty with only the dates and a done count. 30 weeks become a long scroll.
- DrillMap fit: medium. Cards can make Progress look like This week.
- Owner:

### 1C. Compact calendar-style grid
- Apps: [The Outsiders](https://mobbin.com/screens/ee550909-e4d5-4508-83ec-8275853dbff9), [Me+](https://mobbin.com/screens/bc859f54-d4fc-4f2c-a728-0a5f82dc2bd2), [pliability](https://mobbin.com/screens/e51f880b-c434-4beb-9fd8-8deb9306f769), [stoic.](https://mobbin.com/screens/0b7ae0bc-956f-4770-b350-945d66378a66), [Duolingo](https://mobbin.com/screens/1755644a-3b98-4a8e-906f-0ef606e166eb). Refs: `1-me-week-grid.png`, `1-pliability-month-grid.png`, `1-stoic-month-grid.png`, `1-theoutsiders-week-dots.png`.
- Works when: the goal is streaks or a habit pattern.
- Tradeoffs: it invites streak reading, and stats are out of scope. The cells are small to tap. A skipped week looks like a failure, and the brief chose to hide skipped weeks.
- DrillMap fit: weak.
- Owner:

Researcher's view: 1A.

## 2. How should month headings look, and should they stick to the top while scrolling?

### 2A. Quiet text heading that scrolls away
- Apps: [Wise](https://mobbin.com/screens/8e6bce0d-c1a2-4941-92f8-708fce792020), MacroFactor, Apple Fitness. Refs: `2-wise-date-groups.png`.
- Works when: each group is short. A month holds about four weeks, so a heading is always close.
- Tradeoffs: deep in a long list, the student can lose track of the month.
- DrillMap fit: strong. It uses the existing caption or small heading styles.
- Owner:

### 2B. Sticky heading pinned under the nav bar
- Apps: [Monarch](https://mobbin.com/screens/5e408508-0a7e-42d0-8fe4-879ab707bbc1), [Copilot](https://mobbin.com/screens/fd8c7d1d-72cb-4c60-90a5-cd4fd1e5c58c), Nike Run Club. Pinning is **inferred** from the layout. Refs: `2-monarch-date-groups-totals.png`.
- Works when: groups are long and the student scrolls far.
- Tradeoffs: NN/g says a sticky header must earn its space and should be small and opaque ([NN/g, Sticky Headers](https://www.nngroup.com/articles/sticky-headers/)). That article covers page headers, so it applies here only by analogy. On a phone, a sticky nav and a sticky month heading together take a lot of space.
- DrillMap fit: medium.
- Owner:

### 2C. Heading with a count on the right
- Apps: [Nike Training Club](https://mobbin.com/screens/063c8530-6eac-45ea-be78-38c9b9bececd), Nike Run Club, Monarch. Refs: `2-nikentc-month-header.png`, `2-nikerunclub-month-summary.png`.
- Works when: a month total is useful.
- Tradeoffs: only a neutral count like "4 weeks" is safe. A done total for the month is a completion stat, and stats are out of scope.
- DrillMap fit: medium.
- Owner:

Also seen, not recommended: a month tab strip ([Gymshark](https://mobbin.com/screens/71873f8b-4464-4342-b03a-fb6d1c3892ea), `2-gymshark-month-tab.png`) and a year list that opens months ([PayPal](https://mobbin.com/screens/64c0ed49-09e6-4881-a421-04f12f85a542), `2-paypal-statements-year.png`). Both hide weeks behind an extra tap.

Researcher's view: 2A.

## 3. How should a read-only past week signal that it is not This week, beyond its header?

### 3A. Small "Past week" chip near the title
- Apps: [Plane "View only"](https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d), [Substack "Current version"](https://mobbin.com/screens/d1d0d099-5452-4842-bbb7-681486136291). Refs: `3-plane-view-only-badge.png`, `3-substack-current-version-tag.png`.
- Works when: one word explains the state.
- Tradeoffs: a chip is easy to overlook if it is the only signal.
- DrillMap fit: strong. It reuses the system's pill and caption styles.
- Owner:

### 3B. Calmer page with no check-off controls
- Apps: [Linear](https://mobbin.com/screens/6c14e085-9ff5-4e61-9a21-b04f1b0a3433), [Notion](https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210), [Calm](https://mobbin.com/screens/83b8e361-fbe8-451a-b297-360753dc661a). Refs: `3-linear-version-history.png`, `3-calm-week-of.png`.
- Works when: the page has no actions, so having no controls says "read only".
- Tradeoffs: if the ticks get too faint, the week looks disabled instead of done. Keep full tick contrast.
- DrillMap fit: medium to strong. `07-this-week-patterns` already defines this rule for past weeks.
- Owner:

### 3C. A banner above the plan
- Apps: [Gemini](https://mobbin.com/screens/dc5ae6d8-4aa1-4bd0-b4be-7fcfde267f23), Plane.
- Works when: the student might try to act and needs a warning.
- Tradeoffs: it costs about 48 px and repeats the header. DrillMap's notice strip means "action needed", so using it here blurs that meaning.
- DrillMap fit: medium.
- Owner:

Researcher's view: 3A, plus the no-controls rule from 3B.

## 4. Where do "← All weeks", "← Older week", and "Newer week →" sit on desktop and on a phone, and should a phone also support a swipe between weeks?

### 4A. Back link above the title, with Older and Newer as a pair in the header row
- Apps: [Tiimo](https://mobbin.com/screens/8a6a1881-0e17-4cfa-9aa4-114d0b90aeec), Me+, Calm, Duolingo. Refs: `4-tiimo-day-arrows.png`, `4-me-week-pager.png`, `4-calm-week-header.png`, `4-duolingo-month-arrows.png`.
- Works when: the student moves between items of the same kind.
- Tradeoffs: bare arrows are unclear, because the list runs newest first. Text labels fix this. On a phone, each link needs a 44 px tap height.
- DrillMap fit: strong.
- Owner:

### 4B. The same pair repeated at the end of the plan
- Apps: [stoic.](https://mobbin.com/screens/0b7ae0bc-956f-4770-b350-945d66378a66). Ref: `4-stoic-month-pager.png`.
- Works when: the page is long and the student reads to the bottom. A full week on a phone is long.
- Tradeoffs: the links show twice. No Mobbin example shows this on a past-record page, so its fit there is unverified.
- DrillMap fit: strong, as plain links above the footer.
- Owner:

### 4C. Swipe between weeks on a phone, with the links kept
- Apps: [Ten Percent Happier](https://mobbin.com/screens/06212a71-ee34-4b4c-a6cc-5f310f73db22). Swipe is **inferred** from page dots.
- Works when: students flip through many weeks in a row.
- Tradeoffs: a gesture alone is hard to discover, so the links must stay. The helper found no NN/g page on this. Its sources are secondary ([LogRocket](https://blog.logrocket.com/?p=200171)). A sideways swipe can clash with the iOS back swipe, and it needs a clear stop at the oldest week.
- DrillMap fit: medium.
- Owner:

Researcher's view: 4A on both sizes, with 4B at the end. Leave swipe out of the first build.

## 5. What motion moves the student from the list into a week, and between older and newer weeks?

### 5A. Plain page change with a short fade
- Flows: [Nike Training Club history](https://mobbin.com/flows/2806bdb8-8801-4f20-9caf-0eaef364c2a7), [Gymshark](https://mobbin.com/flows/49fb3822-c2cd-4a67-8d82-d0e19ac42898), [The Outsiders](https://mobbin.com/flows/dc8f77a9-cc5d-484e-aa14-b4f06221ec5a). The plain swap is **inferred** from stills. Refs: `5-nikentc-flow-*.png`, `5-gymshark-flow-*.png`, `5-outsiders-flow-*.png`.
- Material calls this "fade through": "used for transitions between UI elements that do not have a strong relationship to each other" ([Material Components, Motion](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)).
- Works when: the move is to a different kind of page.
- Tradeoffs: it gives no sense of direction.
- DrillMap fit: strong. It is close to the reduced-motion path, so there is less to test.
- Owner:

### 5B. Shared axis for Older and Newer
- Material: "used for transitions between UI elements that have a spatial or navigational relationship… a shared transformation on the x, y, or z axis" (same source). Older and newer weeks are peers on a time axis.
- Works when: the student steps between items of the same kind.
- Tradeoffs: the slide direction must match the link side ("← Older" slides one way, "Newer →" the other). Apple: motion that "doesn't make sense can make them feel disoriented" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).
- DrillMap fit: medium. Keep the slide small, about 8 px, like the existing 8 px rise.
- Owner:

### 5C. Container transform: the row grows into the page
- Material: "designed for transitions between UI elements that include a container… creates a visible connection between two UI elements" (same source).
- Works when: a card opens into its own detail.
- Tradeoffs: a slim row and a seven-day page share almost nothing to grow between. DrillMap has no scale or morph motion today.
- DrillMap fit: weak.
- Owner:

Researcher's view: 5A for list to week and back. A small 5B slide for Older and Newer only.

## Flow and motion

Proposals only. They become `motion.md` rows in step 5. Apple says to "add motion purposefully" and to "make motion optional" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)).

| Step in the flow map | Proposed motion | Token | Reduced motion |
| --- | --- | --- | --- |
| Progress nav tab → list | Same as other nav tabs today | — | Same |
| List row → past week | Fade through; scroll starts at top (inferred) | `base`, standard easing | 120 ms fade |
| "← Older week" / "Newer week →" | 8 px shared-axis slide with fade, toward the link's side; header stays still (inferred) | `base`; exit easing on the old page | 120 ms fade, no slide |
| "← All weeks" → list | Fade through; return to the saved scroll spot ([NN/g, Infinite scrolling](https://www.nngroup.com/articles/infinite-scrolling-tips/)) | `base` | 120 ms fade |
| Row hover / press | Fill steps one level | `fast` hover, `base` press | Same, color only |
| Loading | The app's loading state | — | Same |
| Swipe (only if 4C is built) | Page follows the finger, then settles (inferred) | `base` | No follow; links only |

No source, the helper's own view: after Older or Newer, move focus to the page title. After "← All weeks", return focus to the row the student left.

## Source gaps
- Apple HIG and Material 3 pages load their text with JavaScript. Apple quotes come from the page's JSON data. Material quotes come from Material Components for Android, the Material team's own docs, because the m3.material.io text could not be read. No M3 duration values were used. The durations above are DrillMap's own tokens.
- Baymard was not searched. No claim here comes from Baymard.
- Mobbin flow results gave ordered stills with no motion.

## Sources
- Mobbin screens and flows linked above.
- Apple HIG, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Material Components, Motion: https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- NN/g, Sticky Headers: https://www.nngroup.com/articles/sticky-headers/
- NN/g, Infinite Scrolling tips: https://www.nngroup.com/articles/infinite-scrolling-tips/
- LogRocket on swipe gestures (secondary): https://blog.logrocket.com/?p=200171
- DrillMap design system: `docs/design/design-system/05-foundations.jsx`, `07-this-week-patterns.png`, `tokens.css`
