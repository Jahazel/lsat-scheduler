# Design brief: legal pages

Tracking ticket: #746

Pages: `/legal/terms` (Terms of Service), `/legal/privacy` (Privacy Policy), `/legal/ai-disclosure` (AI
disclosure). All three use one shared legal layout.

## Job

A visitor or student reads DrillMap's rules about their Account, plan, data, and AI use. They find one rule fast, such
as cancelling or deleting their Account, and can link to it.

## Flow map

| From | User action | To |
| --- | --- | --- |
| Site footer (any page) | Taps Terms of Service, Privacy Policy, or AI Disclosure | That legal page, at the top |
| Sign-in pages legal links | Taps Terms, Privacy, or AI disclosure | That legal page, at the top |
| Sign-up "I agree" line | Taps Terms of Service or Privacy Policy | That legal page, at the top (same tab) |
| A shared section link, such as `/legal/terms#cancelling-and-refunds` | Opens the link | That legal page, scrolled to the section |
| Legal page switcher | Taps another legal page | That legal page, at the top |
| Section list | Taps a section | The same page, scrolled to that section; the address shows its link |
| Link inside the text (Privacy Policy, email) | Taps it | The Privacy Policy page, or the mail app |
| AI disclosure "Related" list | Taps a section | That legal page, opened at that section (heading under the site header) |
| Legal page | Browser Back | The page the reader came from |
| Legal page | Site header or footer links | Those pages |

## States

| State | When it happens | What it must show |
| --- | --- | --- |
| Top of page | Page opens without a section link | Title, date line, page switcher, section list, text |
| Opened at a section | Page opens with a `#section` link | The section heading in view, not hidden under the site header; the list marks that section |
| Reading | Reader scrolls | The list marks the section in view (desktop: list stays beside the text) |
| Short page | AI disclosure | Title, date line, and switcher; no section list; a "Related" list of the AI sections in the other two pages, hidden when none of them exists |
| Signed in / signed out | Either | Same page; only the site header and footer differ. The signed-in header is 56 px (mobile) and 72 px (tablet and up), the signed-out bar 64 px: sticky bars and section offsets follow the header's real height. Signed-in mobile keeps room for the floating tab bar. |
| Reduced motion | Reader's device asks for less motion | Jumps to sections without a smooth scroll; no animated list marker |
| Missing section link | `#unknown` in the address | The page at the top, no error |

## Data cases

- Terms: 15 sections, some long (Plans, the free week, and renewal), titles up to about 40 characters ("Changes to
  DrillMap and to these Terms").
- Privacy Policy: 10 sections, with lists.
- AI disclosure: 3 paragraphs, no headings.
- Date line: "Effective date" (Terms) or "Last updated" (Privacy Policy and AI disclosure). The AI disclosure line, "Last updated:
  November 10, 2026", is new page text the owner approved on 2026-11-10.
- Terms has a marked gap until #731: `[state to be set before launch]`.
- Section links stay fixed when a section title changes (#731 may rename a section). Shared links and the AI disclosure's "Related" links depend on it. Worst-case data renames "AI reads your screenshots" to "How AI reads your 7Sage screenshots and what you must check".
- Prices come from `src/lib/planPrices.ts`; the text length changes with them.

## Out of scope

- Any change to the approved legal text, including a plain-language summary. The text waits on a lawyer review
  (#731).
- The seller name and governing state (#731).
- A print or PDF version.
- Translations.
- An "I agree" step inside the legal pages.
- Sign-up form state when a student leaves sign-up for a legal page. Checked and tracked on its own ticket if the form
  really empties.

## Open questions

1. ~~Mobile section list~~ Settled 2026-11-10 by the section-list pick: a collapsed "On this page" bar that stays under the site
   header, shows the current section, and opens the full list.
2. ~~AI disclosure date line~~ Settled 2026-11-10: add "Last updated: November 10, 2026", to match the Privacy Policy.

## Sections

In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| Page header: title, date line, page switcher | Editorial: "LEGAL" label, large title, date line, underlined page tabs on a full-width rule | Typographic weight: the pages read as formal documents | "I like editorial." Picked over Segmented and Side rail. |
| Section list (desktop side list, mobile top list) | Jump bar: "On this page" list on the right of the text on desktop (1024 px and wider) with a sliding marker; below that, a bar fixed under the site header that names the current section and opens the list | Always reachable: the reader can jump from anywhere on a long page | "I prefer jump bar." Picked over Quiet list and Numbered index. |
| Body text: headings, paragraphs, lists, links, section links | Calm prose: 16 px text with looser lines, 20 px headings, a link icon beside each heading that copies the section link (shown on hover with a mouse, always on touch), soft-yellow marked gaps | Reading comfort: larger text for a page people read closely | "calm prose." Picked over Numbered clauses and Linked cards. |
| AI disclosure: the short page in the same layout | Related rail: the text in the same column as Terms and Privacy; a "Related" list (right of the text on desktop, below it on mobile) links to the AI sections in the Terms ("AI reads your screenshots") and the Privacy Policy ("Your 7Sage screenshots"), opening each page at that section. Styled like the "On this page" list: thin left line, short page name (the switcher label) above each section title, underline only on mouse hover | Wayfinding: the AI rules are spread over three pages, and the short page points to the other two | "related rail." Picked over Same column and Lead statement. |

Motion: see [motion.md](motion.md). Earlier decision: keep the existing page fade (#586). Add a smooth scroll to a tapped section and a quiet marker in
the section list. Reduced motion turns both off.
