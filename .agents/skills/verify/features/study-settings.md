# Onboarding and Study settings

A student enters their study profile during onboarding. They can later change Study settings. Changes apply to the next weekly schedule created.

## Sub-features

- `onboard` saves the first study profile.
- `capacity` edits every day's minutes or applies one value to all days.
- `preferences` saves scores, Accommodation, goal test date, and preferred practice-test day.
- `settings-persist` reopens saved values while preserving an existing weekly schedule.

## How to get to it (user POV)

- Signup automatically opens `/onboarding`. A signed-in Account without a Student also reaches it from This week or Study settings.
- Click `Study settings` in desktop navigation or `Settings` at narrow widths to reach `/settings`.
- On a weekly schedule's capacity notice, click `Change daily capacity` to reach the same settings.
- Direct `/settings` links enforce sign-in and onboarding.

## Driving it with browser tools

Preconditions:

- Doctor passes. The student is signed in. Use a new Account for onboarding.

- On `/onboarding`, wait for `Step 1 of 4 · Goal` and `Set your target`. Step 1 has no platform field; the server saves 7Sage. Both score boxes and the goal test date start empty, Test time starts at Standard, and Continue is grey with `Enter both scores to continue.`
- Type `150` into `role=textbox[name="Current PT score"]` and `148` into `role=textbox[name="Goal score"]`, then press `Tab`. Expect `Your goal must be higher than your current score, 150.` under the pair. Type `15` as the current score and press `Tab`; expect only `LSAT scores go from 120 to 180. Check your current score.` Fix the scores to 150 and 165. Choose June 2027 in `role=combobox[name="Goal test date"]` with the native-select recipe (`j`, `u`, `Tab`); in Playwright use `selectOption("2027-06-01")`. Test time is the `role=radio` group `Standard`, `1.5× time`, `2× time`. Click `role=button[name="Continue"]`.
- On `Step 2 of 4 · Week`, every day starts at 1 h 30 min and no practice-test day is chosen. Continue is grey with `Pick a practice-test day to continue.` The hint names the practice-test length for the Test time: 2 h 30 min, 3 h 8 min, or 3 h 45 min. Click `role=radio[name="Practice test on Saturday"]`. A chosen day shorter than that length shows `{Day} has {time}. A full practice test takes {length}. Add time on {Day} or pick another day.` and Continue stays available. At 390 px the Week table fits with no sideways scroll; confirm `document.documentElement.scrollWidth <= innerWidth`. Click Continue.
- On `Step 3 of 4 · Analytics`, Back keeps every value. Click `role=button[name="Skip for now"]`. It reads `Saving…` and Back stops taking presses while the save runs. Wait for `/dashboard` and `Add your latest analytics snapshot`. Inspect records. Require one Student linked to the user, numeric current score 150 and goal score 165, daily capacities of 90, `SATURDAY`, Accommodation 1, and the chosen date. Without approved analytics, require no weekly schedule. Reloading `/onboarding` before the save restarts at Step 1.
- Open Study settings through its navigation link. Type `168` into `role=spinbutton[name="Goal score"]`. Click `role=combobox[name="All days hours"]`, press `Escape`, press `0`, then `Tab`. The minutes clamp to 30. In Playwright, select value `0` with `selectOption`. Confirm `All days minutes` is `30`. Click `role=button[name="Apply"]`. Require each day's selector to show 0 hours and 30 minutes, and `Total: 3 h 30 min per week`.
- Click `role=button[name="Save changes"]`. Wait for `/dashboard`. Reopen `/settings` through the navigation and require goal score 168 and all seven capacities 30. Capture screenshots and database records with these values.
- With an existing weekly schedule, capture its document before editing. Drive the `Change daily capacity` entry from a capacity notice. Save a different capacity and reopen This week. Require the entire saved weekly schedule document to remain equal, including its saved capacities and schedule reasons. A later unsaved week uses the updated settings.

## Gotchas

- `Apply` copies the separate All days control to all seven days. Changing All days without Apply changes no daily capacity.
- Every day requires 30 to 480 minutes in 15-minute steps. Selecting zero hours clamps the minutes to a valid value.
- Goal test date options are the LSAT test months after the student-side date, so an Admin's Simulated date shortens the list. A saved date that is no longer offered shows `Select a test date`. Inspect the options before choosing.
- In Study settings, a goal score at or below the current score shows `Your goal must be higher than your current score, N.` under the goal score and blocks the save. The message sits inside the label, so the input's accessible name changes while it shows; use `main label:has-text("Goal score") input`.
- Onboarding Step 3 offers only Skip for now until the screenshot upload is built (issue #165).
