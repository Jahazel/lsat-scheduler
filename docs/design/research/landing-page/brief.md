# Design brief: Landing page

Tracking ticket: #519

## Job
A skeptical LSAT student arrives from a Google ad. In under a minute they must understand what DrillMap does, believe it can raise their score, see what it costs, and press the button to start their free week.

## Pricing and free week (owner decisions, 2026-11-02)
- Two plans: **Weekly $7.99** and **Monthly $25**. Monthly costs about $34.60 a month on the Weekly plan, so Monthly saves about 28%.
- **The free week needs no card.** The student picks a plan only when the free week ends.
- **The free week is one complete Monday–Sunday weekly schedule.** It ends on a Sunday, so it lasts 7 to 13 days. The student picks a plan at the weekend "Plan next week" weekly upload. The page says "Your first full week free", not "7 days free".
- **One free week per email address.** A card at signup is the fallback if abuse shows up after Stripe is connected.
- **Cancel any time.** The student keeps access until the paid week or month ends. No refunds for unused time.
- Rejected: starting weekly schedules on the signup day. 27 source files assume weeks start on Monday, and the tutor's weekday rules would need new answers.

## Sections
1. Top bar: logo, "How it works", "Pricing", "Log in", "Start free week".
2. Hero: promise, "Start free week" button, "Your first full week free. No card needed.", the four numbers (178, Stanford Law, 200+ students coached, 3,000+ hours coached), and the sample week.
3. How it works:
   1. Tell us about your prep: scores, study hours, goal test date.
   2. Upload your 7Sage analytics: two screenshots; you check what we read before we save it.
   3. Get your week: a Monday–Sunday plan aimed at your weakest question types.
   4. Repeat every weekend: new analytics, and next week's plan adjusts.
4. Inside the app: a real look at This week and Progress.
5. Pricing: Weekly and Monthly, both with the free week.
6. FAQ:
   - Do I need a card to start? No. Your first full week is free.
   - What happens after the free week? Pick Weekly ($7.99) or Monthly ($25) to keep getting weekly schedules.
   - Can I cancel? Any time. You keep access until your paid week or month ends. No refunds for unused time.
   - Do I need 7Sage? Yes for screenshots. You can also type your numbers by hand.
   - Is the plan made by AI? No. Fixed rules built from the tutor's coaching method make the plan. AI only reads your screenshots, and you check what it read.
7. Final call to action: one closing band with "Start free week".
8. Footer: Terms, Privacy, AI disclosure, Log in.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Google ad or search result | Clicks | Landing page, top |
| Bookmark, signed in | Opens `/` | `/dashboard` (student) or `/admin` (admin); existing redirect from #448 |
| Landing page | Taps "Start free week" (top bar, hero, either pricing card, final band) | `/signup` |
| Landing page | Taps "Log in" (top bar or footer) | `/login` |
| Landing page | Taps "How it works" or "Pricing" in the top bar | Same page, scrolled to that section |
| Landing page | Opens an FAQ question | Same page; the answer shows below it |
| Landing page | Taps Terms, Privacy, or AI disclosure | `/legal/terms`, `/legal/privacy`, `/legal/ai-disclosure` |

Both pricing buttons lead to the same signup. The plan is not chosen on the landing page, because the student picks it when the free week ends.

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Default | A signed-out visitor opens `/` | All sections, top to bottom |
| Top bar after scroll | The visitor scrolls past the hero | Top bar stays reachable with "Start free week" |
| FAQ item open | The visitor opens a question | Its answer; other items stay as they were |
| Reduced motion | The visitor's system asks for reduced motion | Same content with no movement |

## Data cases
- Prices: $7.99 and $25, with the "about 28% less" note on Monthly. Prices may change later, so the layout must hold four-digit prices such as $12.99.
- The four numbers: short values (178, 200+) and a word (Stanford).
- FAQ: five questions now; the layout must hold eight or more.
- How it works: four steps.
- Phone width (390 px): every section stacks in one column with no sideways scroll.

## Out of scope
- Stripe payments: not connected yet. The pricing section is display only.
- The plan choice screen at the end of the free week, free-week tracking, and billing on the Account page: separate screens that need their own design.
- The 7Sage referral discount ($10/month): dropped for now.
- A founder section with photo, name, and story: owner will add it after the first version.
- Testimonials: DrillMap has no real students yet.

## Open questions
1. Hero: how do strong single-product landing pages pair a short promise with a product preview and proof numbers at desktop width?
2. How it works: numbered steps, a horizontal timeline, or steps paired with screenshots?
3. Inside the app: real screenshots, a framed device mockup, or an interactive sample week?
4. Pricing: two side-by-side cards or one card with a Weekly/Monthly switch? How do pages mark the "best value" plan and a no-card free trial?
5. FAQ: open-close list or always-open two-column list?
6. Top bar: does it stay fixed while scrolling, and when does "Start free week" appear in it?

## Directions
Built 2026-11-02 in Paper, "DrillMap · Design" → Explorations, under the "Landing page · Directions" header. Each is one 1440 px board with a phone-fit note. Exports: [directions/](directions/). Product screens are real exports of approved app boards; the hero shows the This week header with the Saturday and Sunday drill days.

| Direction | Hero | How it works | Inside the app | Pricing | Phone fit |
| --- | --- | --- | --- | --- | --- |
| D1 · Closest to Mercury | Centered headline, button, no-card line; proof numbers (48 px) in a row; wide This week screen | Title left, four numbered rows right | Own section: wide Progress screen | Two cards; Monthly carries "Best value · about 28% less" | Shrinks cleanly |
| D2 · Proof first | Same, but the proof numbers are a full-width ledger at 64 px, the loudest type on the page | Four columns, each with a small app crop | Same as D1 | One bordered panel: "No card needed" strip on top, Weekly and Monthly side by side | Needs care: ledger turns into one column |
| D3 · Product first | Headline, button, then a This week / Progress tab switch over a tall screen; proof row under it | Four alternating rows of text and a large app screen | Absorbed by the hero tabs | Same as D1 | Needs 1:1 detail crops for the step screens |

Shared by all three: top bar, Questions (title left, list right, first item open), closing band, dark footer.

Color (owner asked for color, 2026-11-02): all three heroes put the Log in page's spectrum glow (violet, pink, amber) behind the This week screen, so the landing page and Log in look like one product. Buttons stay Ink; Accent blue stays for links and progress. Each direction then uses the spectrum once more in its own way:
- D1: a "sunrise" glow rises from the bottom of the closing band.
- D2: a violet-to-amber rule tops the proof ledger, and the closing band turns Graphite with the glow rising behind a Chalk button.
- D3: each How it works screen sits on its own color panel: violet, pink, amber, then the full spectrum for "Repeat every weekend".

**Chosen (owner, 2026-11-02): D3 · Product first.** Tablet and phone boards sit next to the desktop board on Explorations ([tablet](directions/d3-tablet-768.png), [phone](directions/d3-phone-390@2x.png)). At tablet and phone, each How it works step becomes one color panel with its text above its screen. On phone, steps 1, 2 and 4 show the real phone app screens.

Critique (impeccable, 2026-11-02): design review scores D1 22/32, D2 20/32, D3 22/32. Fixed before showing: hero screens opened on "Not scheduled" and "Rest day" cards; proof numbers too small in D1 and D3; step numbers below contrast; wrong phone-fit claims in D2 and D3. Open for the chosen direction:
- The tutor is never named, so the proof has no person behind it.
- Sample dates in the screens (September–October) do not match each other or today.
- D2's step crops are too small to read and cut text at the edge.
- "Do I need 7Sage?" and "Is the plan made by AI?" stay closed by default, though skeptical visitors need them most.

## Prototype
Owner approved the D3 desktop, tablet and phone boards (2026-11-02). The clickable prototype is [prototype/index.html](prototype/index.html): it switches between 1440, 768 and 390 px and turns reduced motion on and off. It walks the whole flow map. Pages outside the landing page show a stand-in that names the real path. Screenshots and a motion video: [prototype/shots/](prototype/shots/).

Motion, chosen with `animate` and reviewed with `impeccable`:

| Action | Motion |
| --- | --- |
| Hover a button or link | Color change, 120 ms, ease. Pointer devices only. |
| Press a button | Shrinks to 97%, 120 ms, strong ease-out. |
| Tap "How it works" or "Pricing" in the top bar | Smooth scroll; the section stops under the sticky top bar. A jump past the step screens skips their wipe. |
| Switch This week / Progress | White pill slides to the new tab, 200 ms, strong ease-in-out; the screen crossfades, 200 ms, strong ease-out. |
| Open or close a question | Answer grows or shrinks and fades, 200 ms, strong ease-out; plus turns to minus. |
| A How it works screen first scrolls into view | Wipes up once, 600 ms, strong ease-out. |
| Top bar after scroll | No motion; it is sticky from the start. |
| "Start free week", "Log in", legal links | Instant page change. |
| Focus | Instant 2 px ring: Accent on light ground, Chalk on the dark footer. |
| Reduced motion | No slide, wipe, scale or height change; tab and question fades stay at 120 ms; anchor jumps are instant. |

Token note: the project's `--ease-exit` (`cubic-bezier(0.4, 0, 1, 1)`) is an ease-in curve, which the motion rules ban for UI. The prototype does not use it. The prototype adds `--ease-in-out-strong` (`cubic-bezier(0.77, 0, 0.175, 1)`) for the tab pill.
