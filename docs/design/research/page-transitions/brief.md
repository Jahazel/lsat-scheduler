# Design brief: Page transitions

Tracking ticket: #580

## Job
A visitor moves from the landing page into sign up or log in, and a new student moves through onboarding to This week. Each page change should feel like one site moving, not a page swap. The motion must match the rest of the site: the same durations, curves, and fade style as Progress.

## Flow map
| From | User action | To |
| --- | --- | --- |
| Landing | Taps "Start free week" (top bar, hero, or closing section) | Sign up |
| Landing | Taps "Log in" | Log in |
| Sign up | Taps "Log in" | Log in |
| Log in | Taps "Sign up" | Sign up |
| Log in | Taps "Forgot password" | Forgot password |
| Forgot password | Taps "Log in" | Log in |
| Reset password | Taps "Log in" | Log in |
| Sign up | Submits the email form | Verify email |
| Verify email | Taps "Sign up again" or "Log in" | Sign up or Log in |
| Any sign-in page | Taps the logo | Landing |
| Any sign-in page | Taps Terms, Privacy, or AI disclosure | That legal page |
| Any page in scope | Presses the browser's back button | The previous page |
| Sign up or log in | Signs in for the first time | Onboarding (may show its loading placeholder first) |
| Onboarding step | Taps "Continue" | The next step (Goal → Week → Analytics → Review) |
| Onboarding step | Taps "Back" | The previous step |
| Onboarding | Taps "Skip for now" or finishes Review | This week |

## States
| State | When it happens | What it must show |
| --- | --- | --- |
| Page change · fade with anchors | Any page change in scope | The logo stays still. The old content fades out. The new content fades in and rises a few pixels. |
| Sign-in page ↔ sign-in page | Moving between sign up, log in, forgot password, reset password, verify email | The layout and the preview panel stay still. Only the form and the preview card content change. |
| Onboarding · Continue | Moving to the next step | The new step moves in a few pixels from the right (about 8–12 px). The step label and frame stay still. |
| Onboarding · Back | Moving to the previous step | The new step moves in a few pixels from the left. |
| Browser back | The browser's back button | The same fade as a forward click, with no direction. Onboarding steps keep their direction. |
| Loading placeholder → page | Onboarding loads after sign-in | The placeholder fades out and the page fades in. |
| Phone width | Any move in scope at phone width | The same motion with a smaller rise. |
| Reduced motion | The device has "reduce motion" on | A plain fade with no movement, or no motion. |
| Interrupted | The user clicks again during a motion | The motion continues from where it is. It must not jump or add a second history entry. |
| No browser support | The browser cannot run page motion | The pages change as they do today. Nothing breaks. |

## Data cases
- Destination ready at once (the link was prefetched) and destination still loading (slow network).
- A sign-in page that opens with a notice or an error message at the top.
- Onboarding Analytics step with screenshots added ("Check the values" opens Review) and without them.
- Keyboard users: focus moves to the new page or step heading after the motion, as onboarding does today.

## Out of scope
- Moves between app pages (This week, Progress, Study settings, Account, Admin). The owner chose the signed-out pages and onboarding for now. Onboarding → This week is the only app page included.
- "Continue with Google", which leaves the site for Google's page.
- Browsers without page-motion support. They keep today's plain page change.
- In-page motion that already exists, such as landing reveals and FAQ rows.

## Open questions
1. How do real sites move from a marketing page into sign up or log in, and what do they keep still?
2. How do sites with a split layout (form + preview panel) switch between sign up and log in?
3. How far, how fast, and with which curve should a step-by-step setup move between steps, so that it shows direction and does not feel like a slideshow?
4. How should a loading placeholder hand off to the real page?
5. Which motion values (durations, curves, rise distance) match the approved Progress motion, so the site stays consistent?
6. Flow and motion: what does each move look like when interrupted, on a phone, and with reduced motion on?

## Directions
Not yet built.
