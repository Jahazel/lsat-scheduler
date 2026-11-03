# Design brief: Landing page

Tracking ticket: #TBD

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
Not built yet.
