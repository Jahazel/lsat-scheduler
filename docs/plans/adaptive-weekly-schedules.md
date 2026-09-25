# Adaptive weekly schedules: implementation plan

Status: `adaptive-weekly-schedule-v2` is implemented in the current checkout.

## Goal

Give each student one immutable, deterministic Monday–Sunday weekly schedule shaped by approved analytics, seven daily capacities, a preferred practice-test day, accommodations, and the immediately preceding week's check-ins. Preserve saved inputs and reason sentences so a past week remains understandable after the policy changes.

## Build order and record of work

1. [#42](https://github.com/Jahazel/lsat-scheduler/issues/42) replaced weekday/weekend hours with seven capacities in minutes and a required preferred practice-test day. It introduced `adaptive-weekly-schedule-v2`; no student-data migration was needed because there were no real students. Study settings changes apply to the next schedule created.
2. [#43](https://github.com/Jahazel/lsat-scheduler/issues/43) placed practice tests, their review days, rest, Sunday carry-over review, and days left unscheduled by late creation. Near-test weeks hold two LawHub tests. Each day records its own capacity overage.
3. [#44](https://github.com/Jahazel/lsat-scheduler/issues/44) filled drilling days with a daily minimum, the drilling ratio, starred rotation, a conditional full section, and skip reduction applied to fill limits before adding optional work. Mandatory work may exceed capacity.
4. [#46](https://github.com/Jahazel/lsat-scheduler/issues/46) saved policy-departure reasons with final sentences at schedule creation.
5. [#47](https://github.com/Jahazel/lsat-scheduler/issues/47) displayed overage warnings and saved reason labels in the student and admin views. Its capacity link goes to Study settings on This week.

The original persistence work remains in force: append-only approved analytics snapshots, one schedule per student and week, separately editable activity check-ins, a read-only admin view, and historical `adaptive-weekly-schedule-v1` display. The [v2 specification](../specs/adaptive-weekly-schedules.md) states the current scheduling rules; [ADR 0002](../adr/0002-allow-mandatory-schedule-capacity-overages.md) records which work may exceed daily capacity.

## Verification and release

- Run the test suite, lint, and production build. Confirm that a saved week's capacity and reason sentences remain fixed after study settings change.
- Check the current-week schedule at 375px and desktop widths, with keyboard navigation and screen-reader labels for overage warnings. Issue #47 records that this running-app check was not completed when its code was merged.
- The day-fill discrepancy threshold is 25 percentage points. The automatic rejection checker, capacity sweep, and pre-release LLM reviewer were canceled with #45 and #48.
- Follow the [rollout runbook](../runbooks/adaptive-weekly-schedules-rollout.md) for any existing database.

## Scope limits

No LLM creates, changes, explains, or reviews the schedule. No scheduling rules UI, question-level 7Sage import, missed-week backfill, or recovery of overwritten historical analytics is planned here.
