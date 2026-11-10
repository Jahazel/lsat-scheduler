# Motion spec: plan choice, free week and Account billing

Waits for the owner's approval of the final prototype (`src/app/prototypes/payments`).

This feature adds no new motion. Every row reuses a motion the owner already approved: the page arrival from loading states (`../loading-states/motion.md`), the button Ring and the reading bar Loop from the same file, and the failure toast (`../failure-toast/motion.md`). The rows are one set to approve, not options.

Durations are the design-system tokens: fast 120 ms, base 200 ms. Easing: standard `cubic-bezier(0.2, 0, 0, 1)` (`--ease-standard`), a strong ease-out. Reduced motion follows the design system: drop movement, keep a 120 ms fade. Only `opacity` and `transform` move, except the plan card's border and ring colors.

## Terms

- **Page arrival**: the new page's sections fade in and rise 8 px (4 px on a phone), top to bottom, 40 ms apart. The nav bar and the tab bar stay still. The page starts at the top, and focus moves to the page heading. Code: `arriveSections` in `src/components/PagePlaceholder.tsx`.
- **Stripe page**: Stripe hosts Checkout and the Customer Portal. DrillMap cannot move them, so a path into Stripe ends with the button's Ring, and a path back from Stripe starts with a page arrival.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Plan card | Taps a plan card (plan choice, onboarding or lapsed) | The border and its inner ring change to ink. The radio dot grows from half size and fades in. The card presses to 98 % while held. | fast, ease-out | Color change only, no scale |
| Changed values | Picking a plan changes the first charge, Today, Renews, or the Stripe sketch's "Then …" line | The new value fades in where the old one was. Nothing moves. | fast, standard easing | Same (opacity only) |
| "Add card on Stripe", "Update card", "Manage plan on Stripe" | Taps the button | Button Ring: the label changes to "Opening Stripe…" at once, and the ring fades and grows in from 90 % to its left. The button is off. Then Stripe's page loads. | Ring in: base, `--ease-out-strong`. Turn: 900 ms, linear | Ring fades in, does not turn |
| Failure toast | The server cannot start Checkout or the Customer Portal | The existing failure toast. The picked plan stays. | As `../failure-toast/motion.md` | As that file |
| "Starting your plan…" | Back from Checkout with a card | Page arrival. The reading bar's segment slides across again and again, with no percent. | Arrival: base, standard easing. Segment: 1.4 s per pass, `--ease-in-out-strong` | 120 ms fade, no movement. The segment stays still |
| "This is taking longer than usual." | No confirmation after about 20 s | The line fades in under the bar. The bar keeps sliding. | base, ease (the existing long-read row) | Appears at once |
| "Try again" | Taps it on the slow line | The line goes away at once. The bar keeps sliding, and the wait starts again. | None | Same |
| This week (new student) or the weekly upload page (lapsed) | Stripe confirms the plan | "Starting your plan…" goes away, and the next page does a page arrival. | base, standard easing, 40 ms stagger | 120 ms fade, no movement |
| Plan choice with "You didn't add a card." | Closes Checkout or taps back | Page arrival. The note arrives as the first section, with the page. The last picked plan stays picked. | base, standard easing, 40 ms stagger | 120 ms fade, no movement |
| Weekly upload page showing plan choice | "Pick a plan" on This week, Progress, or the Account Plan card | Page arrival. | base, standard easing, 40 ms stagger | 120 ms fade, no movement |
| Account | "Return to DrillMap" on the Customer Portal | Page arrival. | base, standard easing, 40 ms stagger | 120 ms fade, no movement |
| Plan notes, Plan card, deletion warning | The page shows them | No motion of their own. They arrive with their page as one section. | — | — |
| Landing page wording | Always | No motion. The wording sits in the existing landing sections. | — | — |

**Token conflict (existing, not new).** The long-read line uses the built-in `ease` for an entrance. The `animate` rules prefer a strong ease-out. This feature reuses the row as it ships; a change belongs to the loading-states motion.
