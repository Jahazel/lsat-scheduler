# Analytics and This week

A student approves an analytics snapshot before DrillMap creates a saved weekly schedule. They view the week or one day and report activity check-ins without changing the planned work.

## Sub-features

- `analytics-entry` reaches screenshot review during onboarding or on This week when a new plan needs analytics.
- `analytics-approval` edits candidate values and requires both confirmation statements.
- `schedule-save` creates one saved schedule per student and calendar week.
- `schedule-views` switches Whole week and One day.
- `check-in` saves completed, skipped, cleared, and actual-minute reports.
- `schedule-reasons` shows rest days, unscheduled days, and capacity notices.

## How to get to it (user POV)

- Onboarding has `Analytics screenshot (optional)` for 7Sage.
- Click `This week` in navigation or open `/dashboard`. Without a fresh approved snapshot, the 7Sage student sees `Add your latest analytics snapshot`.
- An Admin can open Test controls on their own student side, choose a sample direction, and click `Generate sample` to reach the same review and approval workflow.
- A saved schedule has `Whole week`, `One day`, day buttons, activity status buttons, and `How this works`.

## Driving it with browser tools

Preconditions:

- Doctor passes. Complete onboarding. For the no-paid-service baseline, use the Admin fixture in [Admin](admin.md).

- For the sample path, click `role=button[name="Generate sample"]` in Test controls. Wait for `Review sample analytics`. Save the before records. Require `Confirm snapshot` to be disabled before both confirmation statements are checked.
- Type `65` into `input[aria-label="Strengthen accuracy"]` if that row is present. Use the live snapshot's exact question-type label for another row otherwise. Changing a value clears approval. Test a `Remove <question type>` button, an Add-row select, and `Add` if those sub-features changed. Capture the corrected rows.
- Click `role=checkbox[name="I reviewed and approved these sample values."]` and `role=checkbox[name="Use this sample as my latest analytics."]`. Click `role=button[name="Confirm snapshot"]`. Wait for `Your plan for this week`. Inspect records and require an approved analytics snapshot with `admin_sample` provenance and one weekly schedule referencing it. Do not claim screenshot extraction passed.
- Reload `/dashboard` and require the weekly schedule ID and full saved document to stay equal. Click `role=button[name="One day"]`, then `role=button[name="SAT"]`. Require only Saturday's card. Click `role=button[name="Whole week"]` and require all seven day cards. Capture schedule reasons and any capacity overage.
- On One day, choose a day with activities. Get an exact activity label from the snapshot. Click its `Mark <activity label> done` button. Wait until saving finishes. Type `25` into `input[aria-label="Actual minutes for <activity label>"]`, then press `Tab` to trigger blur. Reload the page and require completed status and 25 actual minutes. Inspect the activity check-in and require the weekly schedule document to stay equal.
- Click `Clear completed status for <activity label>`, then `Skip <activity label>`, then `Clear skipped status for <activity label>`. Wait for each save and confirm each persisted status after reload. Restrict the locator to a particular day card if the label repeats.
- Click `summary` with text `How this works`. Require wording that the current plan stays saved and a later upload shapes a later week. It is informational, not an upload button.
- For actual screenshot paths, use the harness's documented file-input upload operation on `input[type="file"]` with a synthetic local 7Sage image. The helper sets `SCREENSHOT_EXTRACTOR=fake`, so require the review table with the fixed rows: Strengthen 68%, Necessary assumption 74%, Causal reasoning flagged top priority (Highest), Link assumption not flagged (Medium), and Conditional reasoning 81%. For the failure path, relaunch the helper with `VERIFY_SCREENSHOT_EXTRACTOR=fake-failure` and require the visible `Couldn't read that screenshot` error, no new approved snapshot, and no new schedule. A real Anthropic extraction needs a separately authorized key. After extraction, the screenshot-specific checkbox names are `I reviewed these values and they match my screenshot.` and `This screenshot contains my latest 7Sage analytics.`. Exercise both onboarding and This week entry points when changing extraction. If the harness cannot set a file input, report this path as untested.

## Gotchas

- Analytics candidates do not become approved merely because they appear on screen. Both statements must be checked after the last edit.
- Snapshot approval and weekly schedules are persistent. Never inject records to bypass review for a proof.
- Near-test weeks, a Sunday practice-test review, and already passed days can alter the visible week. Use the saved reasons and actual dates rather than assuming all days have activities.
- Actual minutes save on blur. A visible typed value alone is insufficient.
- Duplicate activity labels require a day-specific locator. Use the real snapshot to identify that card.
- Real Anthropic extraction and Google sign-in remain untested in the default local run. Fake-extractor upload is in scope.
