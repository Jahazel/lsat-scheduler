# Onboarding and Study settings

A student enters their study profile during onboarding. They can later change Study settings. Changes apply to the next weekly schedule created.

## Sub-features

- `onboard` saves the first study profile.
- `capacity` edits every day's minutes or applies one value to all days.
- `preferences` saves platform, scores, Accommodation, goal test date, and preferred practice-test day.
- `settings-persist` reopens saved values while preserving an existing weekly schedule.

## How to get to it (user POV)

- Signup automatically opens `/onboarding`. A signed-in Account without a Student also reaches it from This week or Study settings.
- Click `Study settings` in desktop navigation or `Settings` at narrow widths to reach `/settings`.
- On a weekly schedule's capacity notice, click `Change daily capacity` to reach the same settings.
- Direct `/settings` links enforce sign-in and onboarding.

## Driving it with browser tools

Preconditions:

- Doctor passes. The student is signed in. Use a new Account for onboarding.

- On `/onboarding`, wait for `Tell us about your prep`. The default inputs are 7Sage, score 150, goal 165, Standard time, and 90 minutes per day. The preferred practice-test day and goal test date are initially empty.
- Click `main label:has-text("Preferred practice-test day") select`, press `Escape`, press `s`, then `Tab`. Confirm `SATURDAY` through read-only DOM inspection. Click `main label:has-text("Goal test date") select`, press `Escape`, press `j`, then `u`, then `Tab`. Confirm `2027-06-01`. In Playwright, use `selectOption("SATURDAY")` and `selectOption("2027-06-01")` on those same selectors. Confirm the selected values before submission.
- Leave the optional screenshot empty. Click `role=button[name="Generate my schedule"]`. Wait for `/dashboard` and `Add your latest analytics snapshot`. Inspect records. Require one Student linked to the user, numeric current score 150 and goal score 165, daily capacities of 90, `SATURDAY`, Accommodation 1, and the chosen date. Without approved analytics, require no weekly schedule.
- Open Study settings through its navigation link. Type `168` into `role=spinbutton[name="Goal score"]`. Click `role=combobox[name="All days hours"]`, press `Escape`, press `0`, then `Tab`. The minutes clamp to 30. In Playwright, select value `0` with `selectOption`. Confirm `All days minutes` is `30`. Click `role=button[name="Apply"]`. Require each day's selector to show 0 hours and 30 minutes, and `Total: 3 h 30 min per week`.
- Click `role=button[name="Save changes"]`. Wait for `/dashboard`. Reopen `/settings` through the navigation and require goal score 168 and all seven capacities 30. Capture screenshots and database records with these values.
- With an existing weekly schedule, capture its document before editing. Drive the `Change daily capacity` entry from a capacity notice. Save a different capacity and reopen This week. Require the entire saved weekly schedule document to remain equal, including its saved capacities and schedule reasons. A later unsaved week uses the updated settings.

## Gotchas

- `Apply` copies the separate All days control to all seven days. Changing All days without Apply changes no daily capacity.
- Every day requires 30 to 480 minutes in 15-minute steps. Selecting zero hours clamps the minutes to a valid value.
- Goal test date options are fixed in the current form. Inspect them before choosing a future date.
- The onboarding hint still names Account as the place to edit the profile. The reachable edit form is Study settings.
- The 7Sage path works without an optional screenshot. LSAT Demon reaches an analytics-required empty state rather than a generated schedule.
