# Design brief: failure toast

Tracking ticket: #391 (build ticket #372)

## Job

Tell the student that an action failed for a reason the app did not plan for, and give them the error code to read out or copy. Then get out of the way so they can try again with the screen's own button.

## Flow map

| From | User action | To |
| --- | --- | --- |
| Any screen with a form (log in, sign-up, forgot and reset password, verify email, onboarding, Account cards, weekly upload, admin intake) | Submits; the server has an unexpected failure | Same screen, form keeps its input, failure toast shows |
| This week | Checks off an activity; the save has an unexpected failure | Same screen, the check-off goes back to its saved state, day cards do not move, failure toast shows |
| Any screen with a button that only redirects (Log out, Google buttons, Sign out of all devices, admin nav actions) | Presses it; the server has an unexpected failure | Same screen, failure toast shows |
| Failure toast | Presses its close control | Toast closes; screen is unchanged |
| Failure toast | Does nothing | Open question 2: stays, or closes by itself |
| Failure toast | Moves to another screen (nav link, browser back) | Toast closes; new screen shows with no toast |
| Failure toast | Retries with the screen's own button and it works | Open question 6: toast closes, or stays until closed |
| Failure toast | A second unexpected failure happens | Open question 5: new toast replaces it, or stacks |

## States

| State | When it happens | What it must show |
| --- | --- | --- |
| Shown, desktop | Unexpected failure on a screen wider than the mobile breakpoint | Message "Something went wrong. Try again.", error code, close control |
| Shown, mobile with bottom nav | Unexpected failure on a signed-in student screen on a phone | Same content; must not hide or be hidden by the bottom nav (open question 1) |
| Shown, no app shell | Unexpected failure on log in, sign-up, password, or verify email screens | Same content in the same place as signed-in screens |
| Shown, mobile keyboard open | Failure after submitting a form while the on-screen keyboard is up | Toast stays readable |
| Entering and leaving | Toast appears or closes | Motion from the project's durations (open question 4) |
| Reduced motion | Student's system asks for less motion | Same toast with no movement; fades only |
| Replaced or stacked | Second failure while a toast shows | Open question 5 |

## Data cases

- The message is fixed: "Something went wrong. Try again." (rule 29, PR #371).
- The error code is always 8 lowercase hex characters, such as `3f9a0c2e`.
- Two codes can arrive within a second, such as a double-pressed button.
- A screen can be scrolled far down when the failure comes, such as a long Account page.
- Screens differ in width: narrow auth cards, This week day cards, the wide admin workspace.

## Out of scope

- Success messages, such as "Password changed". They keep their current look; a success toast may be a later ticket.
- Lost connection, where the server never answers and no error code exists. Checked separately; a ticket opens only if it is broken.
- Field errors under inputs and planned refusals, such as "Wrong password". They keep their current look.
- A Retry button in the toast. The student retries with the screen's own button, so no stale input is sent and no delete runs twice.
- Admin and student screens do not get different toasts. One toast covers both.

## Open questions

1. Where does the toast sit on desktop and on mobile, and does it cover the bottom nav?
2. Does it close by itself, or stay until the student closes it? The error code must stay readable long enough to copy or read out.
3. How does the error code show: smaller text, a copy action, or neither?
4. What motion brings it in and out, and what is the reduced-motion version?
5. When a second failure comes while one toast shows, does the new one replace it or stack?
6. Does a later success on the same screen close the toast?
7. How does a screen reader hear it, once per failure (`role="alert"` today)?
8. Which icon, which danger tokens, and does it use `shadow-e3` as `DESIGN.md` reserves for toasts?

## Directions

All three sit bottom-center, use a light card with `shadow-e3`, a danger circle-exclamation icon, and a 44 px close control. Boards are in [directions/](directions/).

1. **One line** (520 px): icon, message, "Error code" and the code, close, all on one row. On a phone it cannot stay one line; the code wraps under the message, which makes it Direction 2.
2. **Two lines** (360 px): message in medium weight, the code line under it. Fits a 390 px phone (366 px between the 12 px side insets) without change.
3. **Danger edge, code chip** (400 px): a 4 px danger stripe on the left and the code in a gray chip. Fits a phone at full width minus the side insets.

Picked: Direction 2, two lines (owner, 2026-10-29).
