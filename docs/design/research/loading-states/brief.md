# Design brief: Loading states

Tracking ticket: #637
Spec: #644. Tickets: #646 (shared placeholder motion, This week), #647 (Progress), #648 (Weekly upload), #649 (Study settings and Account), #650 (Admin pages), #651 (Onboarding), #652 (button waiting state), #653 (reading bar), #654 (clean-up and prototype removal).

## Job
Every wait in the signed-in app looks like what comes next and shows movement. A student never wonders whether the app froze, and the layout never jumps when the real page arrives.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Any signed-in page | Taps a nav tab (This week, Progress, Study settings, Account; Admin for the admin) | That page's placeholder, then the page |
| Browser | Opens or reloads a signed-in URL | That page's placeholder, then the page |
| Sign up or log in | Signs in for the first time | Onboarding placeholder, then Onboarding |
| Onboarding | Finishes Review or taps "Skip for now" | This week placeholder, then This week |
| This week | Opens the weekly upload | Weekly upload placeholder, then Weekly upload |
| Admin student list | Taps a student | Admin student detail placeholder, then the detail page |
| Progress week list | Taps a week | Single-week placeholder, then the week |
| Any page in scope | Presses the browser's back button | The previous page's placeholder (if it is not cached), then the page |
| Onboarding Analytics or Weekly upload | Adds a screenshot | The screenshot row shows the reading bar, then the result line |
| Any form | Taps a button that waits on the server (Save, Send, Sign out, Log in, Sign up, Continue) | The button shows the spinner, then the next state |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Fast load | The page is ready in under 150 ms | No placeholder. The page appears. |
| Page placeholder | The page takes longer than 150 ms | Header and tab bar stay still. Grey shapes in the page's real layout fade in, with a moving sweep. |
| Placeholder → page | The page is ready | The placeholder gives way. The real content fades and rises in, section by section. Nothing changes position. |
| Screenshot waiting | A screenshot waits behind another read | Clock icon and "Waiting to read". |
| Screenshot reading | The read runs | Spinner, "Reading now", and a short segment that slides across the bar again and again (section 4, Loop). |
| Long read | A read runs past 10 s | A line under the bar fades in: "Still reading. This can take up to 30 seconds." The segment keeps sliding. |
| Read done | The read returns rows | A full fill grows from the left and the segment fades. Then the result line ("✓ 12 question types") takes its place and the bar area closes. |
| Read failed | Timed out, cannot read, connection lost | Today's problem text and buttons. Connection lost: the segment stops mid-track and turns grey. Other failures: the bar goes away. It never fills. |
| Button waiting | A button's server action runs | A small spinner left of the label. The label is the wait text ("Saving…", "Sending…", "Signing out…") or the button's own label when it has none. The button never gets narrower (it grows only if the wait text is longer) and cannot be pressed again. |
| Reduced motion | The device has "reduce motion" on | Grey shapes stay still. No sweep. Pages fade in without rising. The reading bar shows a still, faint full bar while it reads; the spinner stays as a still mark. |

## Data cases
- Each placeholder copies the most common version of its page: This week with a full schedule, Progress with several weeks, Study settings with every field, Account with sessions listed, Admin list with several students, Admin detail with a schedule and snapshots.
- Phone width (390 px), where the tab bar floats at the bottom and layouts stack.
- Slow network: a placeholder that stays for several seconds must still look calm.
- Two screenshots read at once (LR and RC), or one waiting while the other reads.
- A read that ends at once (cached or sample) and one that runs to the 30 s limit.
- Buttons with short labels ("Save") and long ones ("Sign out of other devices").

## Out of scope
- The landing page and placeholders for the sign-in pages. Their pages load fast. The sign-in pages still get the button spinner.
- Error pages and failure toasts.
- The empty first-week version of This week. A new student sees it once.
- Made-up progress steps ("Checking values…"). The reader reports no steps.

## Open questions
1. Answered: Sweep, with a 40 ms handoff stagger (section 1).
2. Answered with question 1.
3. Answered: Loop, a sliding segment, replaces the creeping bar from the first interview (section 4).

## Sections
In build order. Fill a row when the user approves the section.

| Section | Picked variant | Axis | User's reason |
| --- | --- | --- | --- |
| 1. Placeholder motion and handoff (shown on This week) | Sweep | One light band crosses the whole page every 1.6 s; the page rises in section by section, 40 ms apart | The owner liked it best of Sweep, Wave and Thread (2026-11-05) |
| 2. Placeholder shapes for every page | Mirror | Every line, field and button is a grey shape in its exact spot, on all 7 pages | The owner liked it for all of them over Outline and Known text (2026-11-05) |
| 3. Button spinner | Ring | A faint full ring with a short head that turns every 900 ms, left of the label; it fades and grows in from 80 % | The owner picked it over Arc and Ticks and said it was fine (2026-11-05) |
| 4. Screenshot reading bar | Loop | A segment 36 % of the track slides across every 1.4 s with a strong ease-in-out; done grows a full fill from the left in 200 ms | The owner liked it best of Creep, Loop and Edge (2026-11-05) |

### Section 1 worst-case findings

Checked with the prototype's Data switch (Demo data, Worst case, Sparse) at 1440, 768, 390, 320 and 195 px (390 at 200 % zoom).

- Fixed: the placeholder's progress summary was 3 px taller than the real one at tablet and phone widths, so every card moved 3 px at the handoff. Demo data now moves 0 px at every width.
- Fixed in the prototype only: the phone bar's current-tab pill now hides below 360 px, as in the app, and a difficulty such as "(L3-5)" no longer breaks across lines.
- Held: no sideways scroll at any width, and no console errors.
- Placeholder vs. real page: the placeholder shows a typical week. A week with the upload reminder, two header notes and five-row days lands up to about 190 px lower than its bars. A sparse first week lands up to about 260 px higher. The bars fade out while the page rises in, so this shows as the page arriving, not as a jump of content the student is reading.

### Section 2 worst-case findings

Checked each page's placeholder at 1440, 1024, 768, 320 and 195 px against the real page drawn from screenshots of the running app.

- Mirror lands on the real page with 0 px of movement on Weekly upload, Study settings, Account, Admin list and Onboarding. This week and Admin student move by one card, where the demo week has a longer Wednesday than the typical placeholder (accepted in section 1).
- Fixed: the Delete account button kept its red border and "+ Add attempt" kept its underline in the placeholder. Both are plain grey shapes now.
- Fixed in the prototype only: Study settings fields, the Weekly upload column and the admin top bar overflowed at 320 px or below.
- Left as is: at 195 px (a phone at 200 % zoom) the Weekly upload drop zones and the Study settings day rows are wider than the screen in the prototype's copy of those pages, placeholder and page alike. The build checks the real pages at that width; the placeholder follows whatever the page does.
- A long email or a long student list changes only the real page. The placeholder keeps its typical shape (decision (a), section 1).

### Section 3 worst-case findings

Checked the five button places with the prototype's Data switch at 1440, 390, 320 and 195 px. Worst case uses real app labels: "Change password" with "Changing password…" (Account), and a save button with no wait text.

- Fixed: a fixed width cut off wait text that is longer than the label ("Changing password…"). The button now keeps a minimum width: it never gets narrower, and it grows only when the wait text needs the room.
- Fixed: at 320 px the save bar squeezed its waiting button 16 px narrower. A waiting button no longer shrinks.
- Rule for the build: a content-width button gives its wait text no more letters than its label where it can. A full-width button (Log in, Continue, Send reset link) never changes size.
- Held: the spinner never pushes the label out of the button, the dimmed button cannot be pressed twice, and the console is clean.
- Left as is: at 195 px the Account card's "Sign out of all devices" button is wider than the screen before any wait starts. The build checks the real Account page at that width.

### Section 4 worst-case findings

Checked onboarding and Weekly upload rows at 1440, 390 and 320 px with the Data switch: long camera and macOS file names, a read that stops at 30 s, a lost connection, and reads that end in under 150 ms.

- Fixed: a long file name pushed "Reading now" and the problem text out of sight (today's app cuts the whole line short). Now only the file name is cut short. A short status stays on the same line, and a problem sentence gets its own line.
- Fixed: the "Still reading" line kept its space after a read failed, which left a gap above Try again. It now goes away when the read ends.
- Fixed: on a lost connection the segment froze wherever it was, sometimes off the track, so no bar showed. It now stops in the middle of the track, in grey.
- Held: no sideways scroll, no console errors, and reads that end at once still show the fill and the result line.
- Left as is: at 320 px the file name shrinks to a few letters ("lr-…"). The status matters more, and Replace still shows the full row.
