# Design brief: Drill setup guide

Tracking ticket: #600

## Job

A student looks at one drill on This week, such as `10 Flaw (3–4)`, and builds that exact drill on 7Sage. The drill
setup guide gives the 7Sage steps filled in for that drill: which section, which Tags filter, which Difficulty, and how
many questions to add.

The guide teaches only 7Sage's hand-pick path (New drill → Customize → filter → Add). It names 7Sage's adaptive drill
only to tell the student to skip it, because the adaptive drill cannot target a question type.

## Flow map

| From | User action | To |
| --- | --- | --- |
| This week, a drill row | Clicks "Set up" at the right end of the row | Guide panel opens, filled in for that drill |
| Shared link to the guide for one drill | Opens the link | This week with the guide panel open for that drill |
| Guide panel | Clicks the close button | This week, focus back on the row's "Set up" button |
| Guide panel | Presses Escape | Same as the close button |
| Guide panel (desktop, tablet) | Clicks the dimmed week behind the panel | Same as the close button |
| Guide panel | Uses the browser's Back button | Same as the close button |
| Guide panel | Clicks a screenshot | Screenshot opens at full size; close returns to the same step |
| Guide panel | Clicks "Open 7Sage drills" | 7Sage's Drills page in a new tab; the panel stays open |
| This week, a drill row | Clicks the row itself (not "Set up") | Unchanged: toggles the row done |

## States

| State | When it happens | What it must show |
| --- | --- | --- |
| LR drill | Row is an LR drill of one type | Steps with Logical Reasoning, one Tags value, the Difficulty range, the count |
| Paired LR drill | Row is a paired LR drill | Step 4 in two passes: filter type 1, add 5; change filter to type 2, add 5 |
| RC drill, 1 passage | Row is one RC passage | Steps with Reading Comprehension and the passage's filter values |
| RC drill, 2 passages | Row is two RC passages | Two passes, one per passage |
| Row is done | Student opens the guide on a checked-off row | Same guide; nothing about done state changes |
| Row has no "Set up" | Full section, practice test, review | No "Set up" button on the row |
| Mapping not confirmed | Until the tutor answers Open question 1 and 2 | Difficulty and RC values shown as the current guess, marked in the prototype only |
| Shared link for a drill not in this week | The link names a drill the week does not hold | This week with no panel, and a short notice that the drill is not in this week |

## Data cases

- Short type name (`Flaw`) and long type name (`Necessary assumption`, `Principle (identify/strengthen)`).
- Paired LR drill whose two names share a last word (`Necessary + Sufficient assumption`) and one where they do not.
- Difficulty as the app writes it: `L2-4` and `L3-5`. The difficulty never splits across two lines.
- The longest real drill names: `10 Parallel flawed method of reasoning + Parallel method of reasoning (L3-5)` and
  `5 PSA - find or complete the application (L3-5)`. On phone, they wrap to three or four lines; the circle and
  "Set up" stay on the first line.
- RC passage with each passage type and level 1 to 5.
- A day with one drill row and a day with four.
- All three widths: desktop 1440 px, tablet 768 px, phone 390 px. Every width shows the screenshots.

## Pictures

The guide uses the partner's five slides (owner decision, Round 1 Q4). Before they enter the repository, the profile
photo, the referral link and balance, and the "drills in process" count are blurred (Round 2 Q7). The raw slides stay
out of the repository because it is public.

| Step | Slide |
| --- | --- |
| 1. Open Study → Practice → Drills | step-1-open-drills |
| 2. Pick the section, click New drill | step-2-new-drill |
| 3. Skip the adaptive drill, click Customize | step-3-customize |
| 4. Filter Tags and Difficulty, click Add on each question | step-4-filter-and-add |
| 5. Check the count, remove extras, Save & share, start the drill | step-5-review-and-save |

## Layout decisions

- Each drill row gets a "Set up" text button at its right end, separate from the row's done toggle (Round 2 Q9).
- Desktop and tablet: a side panel over the week, with the week dimmed but visible. Phone: a full-screen sheet
  (Round 2 Q10).
- Inside the panel, one scrolling list: each step shows its title, the filled-in values, and its screenshot
  (Round 2 Q11).

## Out of scope

- Full sections and practice tests. They use other 7Sage pages; a later design can cover them.
- 7Sage's adaptive drill, beyond telling the student to skip it.
- Onboarding changes. The guide lives on This week only (Round 1 Q2).
- Re-taking the screenshots on a clean account. The owner chose the partner's slides.
- Any change to how DrillMap builds the weekly schedule.

## Open questions

1. **Tutor:** Does DrillMap's LR difficulty, such as `3–4`, match 7Sage's five-dot Difficulty filter, one dot per
   level? Prototype guess: yes.
2. **Tutor:** Does an RC label, such as `Science L3`, match a 7Sage filter? Which filter, and which value? Prototype
   guess: Tags = passage type, Difficulty = level.
3. **Partner:** After "Save & share," how does the student start the saved drill? Until answered, step 5 says
   "Click Save & share, then start the drill."
4. **Partner:** Can 7Sage's Tags filter select two types at once? The paired-drill steps use two passes, so the answer
   does not block the design.

## Sections

In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. "Set up" button on the drill row | Quiet: grey text at the right end of every drill row, also on done rows | Visibility: always shown, quieter than the drill name | "I like the quiet iteration." The owner also asked that hovering "Set up" not shade the row, so only its text darkens. |
| 2. Panel frame: header, drill summary, close, width behavior | Card: a 520 px floating card with rounded corners, inset 12 px, over the dimmed week; full screen on phone until section 6 | Personality: a floating card, not a panel docked to the edge | "I like the original card design." The owner tried an Attio-style checklist and went back to Card. The owner was not convinced by the summary boxes and 7Sage link under the title, so section 3 replaces them. |
| 3. Filled-in values card ("Your filters") | Table: "Section: X", then one table row per filter pass with Tags, Difficulty (five dots and the range) and Add columns, a Total row, then an outline "Open 7Sage drills" button. "(guess)" marks Difficulty, and Tags for RC. | Structure: each value sits in a fixed place, so the student finds it again while working on 7Sage | "I think the table iteration." The owner picked it over a plain sentence and 7Sage-style filter chips. |
| 4. Step list with screenshots | Stacked: under a "Steps on 7Sage" label, five numbered steps on a vertical line; each step's screenshot shows at full card width under its text. Step 4 repeats the table's values in words. A screenshot click opens the full-size view (section 5). | Density: every screenshot visible without a click | Picked "Stacked" over Thumbnails and Show on demand, after "It looks good". |
| 5. The guide as a centered deck (replaces the section 2 Card and the section 4 Stacked steps) | Landscape: "Set up" opens a centered card over the dimmed week, one card per step. The screenshot is on the left; the step count, title, text and buttons are on the right. Step 4 also shows the section 3 table. Dots, Back, Next step, and Done on the last card. Click the screenshot to see it at real size. Every card has the same size: 1080 × 680 px at most on desktop and tablet; on phone the screenshot sits on top and the buttons stay pinned at the bottom. | Layout: screenshot and words side by side, so the screenshot gets the most room without covering the screen | The owner rejected full-screen views ("why does it have to cover the whole screen?") and pointed to the Craft, Hilo and Replit centered cards. The owner then removed the side card ("Remove this completely") and picked "I like the landscape version" over Cover first and Filters on every card. The owner asked that every card keep one size, so the card has a fixed size and the screenshot fits inside a fixed area. |
| 6. Phone sheet | Covered by section 5: on phone the deck is full width with a 12 px edge, up to 680 px tall | | The owner agreed no separate round is needed: "Yes I like this." |
| 7. Motion between cards | Slide: the new screenshot and step text fade in and move 12 px from the side the student moves to (from the right for Next, from the left for Back or an earlier dot). 220 ms, cubic-bezier(0.23, 1, 0.32, 1); the text follows the screenshot by 40 ms. The card, header and buttons stay still; the old content leaves at once. Reduced motion: fade only. Opening the guide does not play it. | Motion: show which way the student moved | The owner picked "slide" over Fade (blur and fade, no direction) and None (instant swap). |

## Carry to spec

Worst-case findings from section 3 (Table). The owner accepted the prototype as it is; the build fixes these:

1. On phone, the difficulty range breaks across lines ("3 to" / "5"). Keep the dots and range on one line.
2. On phone, the "Difficulty (guess)" header wraps. Keep each header on one line.
3. A two-passage RC drill lists passages in data order in the table but easiest first in the title. Use the title's
   order in both.
4. A paired drill splits its count in half. An odd count would show "3.5"; give the first type the extra question.
5. At 200% zoom on phone, the guide title fills the screen. Section 6 decides whether the title scrolls away.

From section 4 (Stacked). Fixed in the prototype: the table stacks each pass's values when the card is narrower than
300 px (it spilled 18-57 px at 200% zoom), and the partner's slide arrows are painted over. Carried:

6. In the stacked narrow table, the "(guess)" mark is gone with the hidden header. Put it back on the Difficulty label.
7. The screenshots' own text is unreadable at card width (33% of real size on desktop, 23% on phone). Section 5 gives
   the full-size view.
8. The screenshots show the partner's example filters, not the student's drill. Step 4's text carries the student's
   values; a caption such as "Example from 7Sage" may help.
9. The painted-over arrows leave faint seams in slides 1, 2, 3 and 5. Clean slides before release.

From section 5 (Landscape deck). Fixed in the prototype: every card has one fixed size; Back and Next step stay pinned
at the bottom of the card on a short screen (1280 × 640) and on phone; the difficulty range stays on one line (this
also fixes item 1); a long drill name takes two lines at most in the phone header (this also fixes item 5); on short
screens such as 200% zoom, the screenshot area shrinks to 140 px so the step text has room. Carried:

10. On phone, tall screenshots such as step 4's shrink to about 110-160 px wide, so their text is unreadable until the
    student taps to zoom. Show a "Tap to zoom" hint under the screenshot on phone.
