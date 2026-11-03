# Findings: Landing page

Brief: [brief.md](brief.md). Tracking ticket: #519.

Examples come from Mobbin web sections at desktop width. Each one is saved in `refs/`, named by open question (`1-` to `6-`). The `refs/` folder is git-excluded, like the other design research folders. Usability claims cite their sources.

Fit is judged against `DESIGN.md` and `PRODUCT.md`: Vellum, Paper, and Ink surfaces; the `bg-ink text-chalk` primary button; Accent is never a button or card fill; the dark `bg-ink` sample-week panel with `shadow-e2`; `max-w-content` 1120 px; motion durations 120, 200, and 320 ms.

## Sources

- NN/g, [Sticky Headers](https://www.nngroup.com/articles/sticky-headers/): keep a fixed bar small, opaque, and free of animation.
- NN/g, [Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/): an FAQ is a good fit for an accordion. Hidden content can be missed.
- NN/g, [In-page links](https://www.nngroup.com/articles/in-page-links-content-navigation/): split content into headed sections, and style in-page links clearly.
- NN/g, [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/): 57% of viewing time falls above the fold, and 74% falls in the first two screens.
- NN/g, ["Get Started" Stops Users](https://www.nngroup.com/articles/get-started/): vague button labels mislead. A monthly fee found late reads as a trap.
- NN/g, [Show the price](https://www.nngroup.com/articles/show-price/) (search result only, B2B study): hidden prices read as evasive.
- Material Design M1, [Duration and easing](https://m1.material.io/motion/duration-easing.html): desktop transitions take about 150–200 ms. Entering takes 225 ms, and leaving takes 195 ms.
- Apple, [Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/) (search result only): continuous motion must stop under the setting or offer a stop control.

Gaps: no Baymard source applied. No usability study on plan switches or no-card trials turned up. The Apple HIG Motion page and the Material M3 pages did not load.

## 1. Hero

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Stats band under the hero | Teachable, Duolingo Plus, Voiceflow (`refs/1-teachable-*`, `1-duolingo-*`, `1-voiceflow-*`) | Easy-to-scan proof | Falls below the fold, where attention drops. Equal tiles read as a template | Medium |
| B. Numbers as the loudest type | MasterClass (`refs/1-masterclass-hero-big-numbers`) | Proof is the main reason to believe | Needs one scale for "178", "Stanford Law", and "3,000+" | Strong, with a size cap |
| C. Split hero: copy left, product right | ClickUp, Slack, Lyssna (`refs/1-clickup-*`, `1-slack-*`, `1-lyssna-*`) | Button at the first eye stop; the product answers "what is it" | Often paired with gradient or blob art (anti-reference) | Strong; the sample-week panel is the right column |
| D. Centered hero, screenshot cropped at the fold | Craft, Linear (`refs/1-craft-*`, `1-linear-*`) | Wide products | No room for proof beside the button; a narrow weekly plan wastes the width | Weak to medium |

Owner pick (2026-11-02): Mercury's centered hero, a form of D ([Mobbin](https://mobbin.com/sites/sections/36860ef7-69eb-4cac-9ad4-cf2c5c097dba), `refs/1-mercury-centered-hero-email-button-app-screen-below`). Its warm off-white ground, dark type, and single blue match the log in and sign up pages. Adapt: Ink button, not a blue fill; no purple glow; a wide This week screen below the buttons, not the narrow sample week.

Lyssna puts the no-card note next to the button. That placement suits "Your first full week free. No card needed."

**Recommendation:** C, with B's type scale for the four numbers under the button.

## 2. How it works

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Row of numbered columns | Clay, Beside, ClassPass (`refs/2-clay-*`, `2-beside-*`, `2-classpass-*`) | Short steps of equal length | Little room for step 2's longer text. Boxed cards look like a feature grid | Medium to strong in Beside's plain form |
| B. Vertical list on a line, or giant numerals | Railway, Trawelt (`refs/2-railway-*`, `2-trawelt-*`) | Steps of different length; reads the same on phone | Tall | Strong |
| C. Icon or screen per step | Blue Apron, Titan ([Mobbin](https://mobbin.com/sites/sections/0d103afa-c85e-4568-a98a-0a1e7cbd5e8f)), V7 (`refs/2-blue-apron-*`, `2-titan-*`) | Steps that need a picture to make sense | Stock icons (Blue Apron). An accordion hides steps (Titan) | Medium |

**Recommendation:** B, with plain number and title text and one real screen beside step 2 (the check step for the screenshots).

## 3. Inside the app

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Real screenshot in a plain frame | Linear, Craft, Sana (`refs/3-sana-*`) | One screen tells the story | Needs believable sample data and alt text | Strong, in a `rounded-md` frame |
| B. Tabs that swap the screen | Framer, V7, Affinity, Superhuman (`refs/3-framer-*`, `3-v7-*`, `3-affinity-*`, `3-superhuman-*`) | Two to four screens | The second screen hides until a tap. Auto-advance needs a stop control (Apple) | Strong with two tabs: This week, Progress |
| C. Device mockup | Slack, Headspace | Mobile-first apps | Shrinks the screen; a template element | Weak at desktop |
| D. Interactive sample week | None found | — | Costly, and repeats the hero panel | Medium |

**Recommendation:** A with B's two-tab control. No auto-advance.

## 4. Pricing

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Two cards side by side | Duolingo, Monologue (`refs/4-duolingo-*`, `4-monologue-*`) | Both prices must be seen together | Duolingo's colored header would break "Accent never a fill" | Strong, with a text tag on `bg-accent/tint` |
| B. One card with a Weekly/Monthly switch | Monarch, Oku, Fruitful, Maze (`refs/4-monarch-*`, `4-oku-*`, `4-fruitful-*`, `4-maze-*`) | Many plans, one price at a time | Hides one price. The 28% saving needs both visible. The switch asks for a choice that has no effect here | Weak |
| C. Plan rows with a radio check | Headspace (`refs/4-headspace-*`) | The plan is chosen on the page | A selected row implies a choice was made | Medium, for its text only |

- Best-value marks seen: a corner text tag, a saving ribbon, a percent tag, a struck-through old price.
- The trial goes in the section headline (Monarch, Fruitful, Headspace).
- No example put "no card" inside the plan cards. So repeat it in the hero, above the card buttons, and in the FAQ.
- "Start free week" names the result, which NN/g finds beats a vague "Get Started".

**Recommendation:** A. Monthly gets a "Best value · about 28% less" tag. "Your first full week free. No card needed." sits above both buttons. Borrow Headspace's renewal fine print and "Cancel anytime".

## 5. FAQ

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Single-column accordion | Lattice, Mixpanel, Cake, monday.com (`refs/5-lattice-*`, `5-mixpanel-*`, `5-cake-*`, `5-monday-*`) | Five to fifteen questions | Hidden answers can be missed (NN/g) | Strong in a 640 px column with Vellum Line dividers |
| B. Title left, list right | Origin, HubSpot (`refs/5-origin-*`, `5-hubspot-*`) | Wide desktop pages | HubSpot's two accordion columns go uneven when one opens. Origin's title-only left column does not | Medium to strong, in Origin's form |
| C. Always open | None found | Few questions that most visitors need (NN/g) | Grows long at eight or more | Medium |

**Recommendation:** A inside B's Origin frame. Several items may be open at once. The card and cancel questions come first.

## 6. Top bar

| Pattern | Examples | When it works | Tradeoffs | DrillMap fit |
| --- | --- | --- | --- | --- |
| A. Fixed bar, button always shown | Headspace, Duolingo Plus, Equals, Clay (`refs/6-headspace-*`, `6-equals-*`, `6-clay-*`) | Long pages with one main action | Takes 56–64 px of height | Strong |
| B. Button joins the bar after the hero button scrolls away | Inferred, no still can show it | Pages that avoid a doubled button | Layout shift | Medium |
| C. Floating pill, or hide on scroll down | mymind (`refs/6-mymind-*`) | Visual-first brands | Translucency hurts contrast. A hidden bar breaks "reachable after scroll" | Weak |

**Recommendation:** A. A slim, opaque bar with the button from the start. On phone, the two section links move into a menu (not tested against an example).

## Flow and motion

| Element | Trigger | Motion | Reduced motion |
| --- | --- | --- | --- |
| Section scroll | Tap "How it works" or "Pricing" | Smooth scroll, 320 ms, `cubic-bezier(0.2, 0, 0, 1)`. `scroll-margin-top` equals the bar height. The URL hash updates, and focus moves to the section heading | Jumps with no animation |
| FAQ item | Tap a question | Opens in 200 ms on the standard curve. Closes in 200 ms on `cubic-bezier(0.4, 0, 1, 1)`. Each question is a button with `aria-expanded` | Shows and hides at once |
| Top bar | Scroll | None (NN/g: no animation on sticky headers) | Same |
| Hero panel | Page load | One fade and 8 px rise, 320 ms. No loops and no count-ups | 120 ms fade only |

All FAQ motion is inferred from still frames. The hero panel motion is a recommendation, not read from an example. `animate` sets the final values in `motion.md`.
