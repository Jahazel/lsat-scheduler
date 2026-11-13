# Motion spec: Onboarding redesign

Tracking ticket: #852. Brief: [brief.md](brief.md).

Durations and curves are the tokens in `src/app/globals.css`: Fast 120 ms, Base 200 ms, Slow 320 ms, Standard curve (`--ease-standard`), Strong ease-out (`--ease-out-strong`).
"Rise" means 8 px on screens 768 px and wider and 4 px below, as in `src/lib/pageMotion.ts`.
The prototype that played every row, `/prototypes/onboarding-redesign`, was deleted by #868.

## Flow map transitions

One row per row of the brief's Flow map, in the same order.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Whole page, Sign-up → first question | Google sign-in finishes | Today's whole-page arrival: the old page fades out, then the top bar, question column, and preview rise in, 40 ms apart | Fast exit, Strong ease-out; Base entry, Standard curve | Old page goes at once; new parts fade in, Fast, no rise |
| Whole page, any app page → first question | A student with no profile opens This week, Progress, Study settings, Account, or Weekly upload | Same whole-page arrival as the row above | Same as above | Same as above |
| Question column | Continue (answers valid) | The step fades out moving 8 px left, the next step fades in from 8 px right; the step ring fills; the preview's week bars and focus border follow | Column: Fast exit, Base entry, Standard curve. Ring: Base, Strong ease-out. Preview: Base, Strong ease-out | Step swaps with a Fast fade; ring, bars, and focus border change at once |
| Question column | Back | Mirror of Continue: out to the right, in from the left; answers stay | Same as Continue | Same as Continue |
| Whole page | Reload on any step | None: a browser load opens the first question with answers lost (#853) | — | — |
| Whole page | Log out | Log out shows its wait spinner; the Log in page then appears with no app motion, as today | — | Same |
| Question column | Continue after both screenshots are read | Same as Continue | Same as Continue | Same as Continue |
| Question column | Continue after typing values | Same as Continue | Same as Continue | Same as Continue |
| Pinned bar, then the area under the top bar | Skip for now | "Skip for now" turns into "Saving…" with the saving note. When the save ends, the area fades out moving 8 px left, then the Week reveal fades in and its parts rise in one wave (next row) | Exit Fast, Strong ease-out; area entry Base, Standard curve | No exit motion; the area fades in, Fast |
| Pinned bar, then the area under the top bar | Confirm snapshot | Same as Skip for now; the button shows "Saving…" and Back is disabled while saving | Same as above | Same as above |
| Week reveal parts | First paint of the Week reveal | Heading, score line, week, and drills rise 8 px in one wave at 0, 70, 120, and 160 ms; the day bars uncover from their base, left to right, 140 to 320 ms | Slow, Strong ease-out (first-visit tier: seen once per student) | All parts fade in together, Base, no delays, no rise |
| Area under the top bar | Choose your plan (student) | Moves forward like a step: out 8 px left, Plan choice in from 8 px right; the top bar reads "Last step · Plan" | Fast exit, Base entry, Standard curve | Fast fade |
| Whole page | Go to This week (admin) | Today's whole-page arrival into This week | Fast exit, Base entry, Standard curve | Fast fade, no rise |
| Whole page | Reload on the Week reveal | None: a browser load opens Plan choice (student) or This week (admin) | — | — |
| Pay button, then the browser | Add card on Stripe | The button shows "Opening Stripe…", then the browser leaves for Stripe. Returning lands on This week by a page load | — | Same |

## In-screen motion

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Upload box content | Idle → reading → read, or a read problem | New content fades in from 4 px below | Base, Strong ease-out | Fade only, Base |
| Upload box border | Drag over, rejection, problem | Border and fill colour change | Fast, ease-out | Same |
| Reading bar | Screenshot is being read | Today's `ReadingBar` (Loop) | Today's values | Today's values |
| Small round buttons (Try again, Replace, Type them instead) | Press | Scale to 0.97 | Fast, ease-out | Same (press feedback only) |
| Week stepper − / + | Press | Background darkens | Fast, ease-out | Same |
| Practice-test row | Pick a practice-test day | Row tint fades in | Fast, ease-out | Same |
| Review value bar | Type a value | Bar end moves to the new value (clip-path) | Fast, Strong ease-out | Changes at once |
| Priority flag switch | Tap | Thumb slides, track colour changes | Fast, Strong ease-out | Same |
| "Where to find these in 7Sage" | Open or close | The + turns 45° | Fast, ease-out | Same |
| Plan card | Pick a plan | Border and inner dot change; dot grows from half size; the changing fact values fade in | Fast, ease-out | Card press scale off; colours same |
| Failure toast | A save fails | Today's toast; it sits 12 px above the pinned bar | Today's values | Today's values |
