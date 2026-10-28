# DrillMap verification map

Read this index before driving the app. Each linked file defines user entry points, exact browser handles, and observable proof. The six areas below are the starting map, not a claim that every behavior has been tested.

## Baseline preconditions

- Launch with the parent skill's helper. Require Doctor to pass on port 3100.
- Start with an empty database and a dedicated browser tab at `http://127.0.0.1:3100`.
- Use `verify-student@example.test` for the first student. Use a different address for each additional Account. Every Account signs in with a minted session cookie from the parent skill's `session` command; this baseline has no Google client.
- Create fixture Accounts with the parent skill's `seed` command. It onboards them with 7Sage, current score 150, goal score 165, 90 minutes for every day, Saturday as the preferred practice-test day, Standard time, and June 2027. When the change touches onboarding, seed with `--not-onboarded` and enter these answers through the UI instead. Choose a later offered date if June 2027 is no longer future. Do not inject approved analytics or schedules into the database.
- For an Admin fixture, seed with the `admin` role.

## Driving conventions

The recipes name logical browser operations. Bind them to the current harness as described in the parent skill. Use accessible roles and names. Inspect a text-only snapshot before interaction on a new screen. Use the parent skill's tested keyboard recipe for native selects, or Playwright `selectOption` in an isolated context. Wait for visible results, not a fixed delay. At narrow widths the Study settings navigation label is `Settings`. Recheck selectors from the live snapshot.

## Proof and skip reporting

Capture the action, resulting UI, and persisted records. Retain evidence through cleanup. Record each entry point exercised. A Sample analytics snapshot proves sample approval and scheduling. It does not prove screenshot extraction. A direct URL does not prove navigation links. Report an unavailable browser file-input operation or missing provider credentials as an untested path. Never silently substitute a sample, API request, or different entry point.

## Features

- [Sign-up and Account](sign-up-account.md): public navigation, the Google-only Login and Signup states, consent, sign-out, and student deletion.
- [Account sessions](account-sessions.md): the current-Account check on every request, Sign out of all devices, Disabled Accounts, role changes, and session time limits.
- [Onboarding and Study settings](study-settings.md): initial study profile, daily capacity, preference editing, and persistence.
- [Analytics and This week](weekly-schedule.md): the weekly upload (screenshots and practice-test sections), snapshot review and approval, saved schedule views, activity check-ins, and the daily analytics save limit.
- [Progress](progress.md): empty state, finished-week summaries, past-week details, and legacy deep links.
- [Admin](admin.md): all-student read-only views, workspace switching, Simulated date, Sample analytics snapshots, and resets.

Public `/legal/terms`, `/legal/privacy`, and `/legal/ai-disclosure` pages remain accessible while signed out. The landing page's sample study plan and signup links are part of the sign-up recipe. Billing is deferred in the README. The app has no notification signup: the unused lead form was removed on issue 303.
