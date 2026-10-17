# Admin date testing validation

Validated on September 27, 2026 against issue 59 and its remaining tickets, 63 through 67. Earlier commits already implement tickets 60 through 62.

## Original implementation checks

- Full Vitest suite: 39 files, 338 tests passed.
- TypeScript, ESLint and the optimized production build passed.
- Workspace tests cover a Wednesday start, three simulated weeks, required fresh analytics, performance trend, skip reduction, Sunday practice-test review carryover, forward-only moves, both resets and rebuild after changing daily capacity.
- Route tests cover normal and simulated approval times, real-time screenshot freshness, simulated calendar dates across UTC midnight, and sample rejection for students and stale admin tokens.
- Each test action rejects non-admin sessions before database access and rejects a token whose admin role no longer matches the database.
- Existing sample-generator, make-admin, account-deletion and real-student isolation tests remain passing.

## Original browser walkthrough

Used disposable QA accounts in the development database, with the user's confirmation. Promoted the admin fixture with make-admin before signing in. The admin session used the in-app browser; the real-student session used Chrome. The real-student isolation fixture used seeded study settings and approved analytics. No screenshot OCR request was made. After validation, both QA sessions were signed out and the disposable accounts and their records were removed.

1. Admin login landed on All students. My student side opened onboarding.
2. Completed onboarding, moved to Wednesday, September 30, and generated a first sample. Edited an accuracy and a priority flag before approving on the shared review screen.
3. The weekly schedule began September 28 with Monday and Tuesday unscheduled. Saved one skipped activity and one completed activity.
4. Moved to Monday, October 5, and approved an improving sample. The next schedule showed skip reduction and Monday review for the previous Sunday's practice test.
5. Moved to October 12 and approved a slipping sample. Progress showed the two earlier weeks and three weeks of planned work.
6. Changed Tuesday capacity to four hours, then confirmed Rebuild this week. The new Tuesday contained 3 hours 54 minutes of planned work. Earlier weeks remained available.
7. At a 390-pixel viewport, opened the header date chip, moved the date to October 14 in the slide-over, and dismissed it with Escape. Focus returned to the chip. The collapsed desktop strip retained its Simulated label and date.
8. Reset test data cleared schedules, check-ins and snapshots, cleared the simulated date and retained Tuesday's 240-minute capacity. The admin stayed onboarded.
9. Reset everything returned the admin to onboarding on the real date. Repeated onboarding successfully.
10. All students listed only the non-admin QA student while both accounts had Student records. The separate student session retained its September 21 real-date weekly schedule and never displayed the admin switcher or test controls. Opening that student from All students showed the same week with read-only controls. Database checks confirmed its schedule, check-in and snapshot survived the admin reset.

## UI audit and polish

The Impeccable detector reported no findings. Desktop and mobile inspection covered the dock, collapsed strip, date chip, native dialog, inline confirmations and analytics review.

| Dimension | Score out of 4 | Evidence or limit |
| --- | --- | --- |
| Accessibility | 3 | Labels, keyboard actions, focus restoration and modal focus handling checked. No independent screen-reader run. |
| Performance | 4 | No polling or animated layout work; actions load data on demand. |
| Responsive layout | 3 | Desktop dock and 390-pixel slide-over checked. Compact weekday buttons retain the selected prototype's seven-column layout; no physical touch-device test. |
| Theming | 4 | Existing ink and accent tokens used. |
| Implementation integrity | 4 | Shared review and approval path, production actions, no prototype routes or variant switchers. |

Polish fixes included refreshing navigation after onboarding and study-setting changes, updating the upload indicator after schedule creation, closing a mobile dialog when resizing to desktop, and limiting sample drafts to their authenticated owner.

## Code review

The initial review requested stronger rebuild coverage, which was added. Its clean-review conclusion was incorrect. A subsequent review found a real-student save-error regression, prohibited simulated-date names, missing LSAT Demon rebuild availability, sample clock skew, changed screenshot wording and check-in creation timestamps, plus the cleanup items recorded below. It also identified same-date approval ordering as a known limitation.

These changes were committed in `97af8cc`.


## Review fixes, September 27, 2026

The user approved the fix plan and test boundaries before edits. Work stayed in the existing checkout against `55e973e52bea17e5eb8369670314ef712c181735`, including the untracked issue 59 files.

- Failed sample analytics snapshot saves show a readable server message. Screenshot saves show "Couldn't save. Try again." regardless of the server message. Empty, HTML, malformed JSON, invalid error values and rejected network requests have component regression tests.
- The admin action is now `setSimulatedDate`; the formatter is `displaySimulatedDate`. Action and control tests cover the renamed call path and displayed date.
- Navigation checks for a saved current weekly schedule on both platforms. Only 7Sage requests analytics uploads. Tests cover both platforms with and without a schedule.
- Authorized sample approvals tolerate a browser confirmation timestamp before the server extraction timestamp. Screenshot ordering, freshness checks and authorization remain enforced. Route tests cover the sample/screenshot distinction and existing student/stale-admin rejection.
- Screenshot review restores both the visible "Add a type the screenshot missed…" option and its accessible name. Sample review retains "Add a question type…". Both review layouts are covered.
- New activity check-ins default to their actual creation time. Only a verified simulated admin clock opts into the schedule timestamp. Repository and dashboard tests cover normal students, admins and stale admin sessions.
- Approved cleanup uses `isAdminUser`, explicit reset scopes, reset configuration fields, `dateInScheduleTimezone`, a shared snapshot-week helper and one verified user read in the header. Tests cover reset destinations, confirmation copy, schedule availability and stale header sessions.
- Past and current dates now have visible "Past" and "Today" labels and disabled styling. `DESIGN.md` documents the dock. ADR 0003 is marked `Status: Proposed` pending acceptance.
- A follow-up fix restored the original retry message for real students and admins saving screenshots. The Admin sample flow still shows a readable server error. Uploader tests cover both paths.

The follow-up save-error correction passed the uploader tests (9), the full suite (43 files, 368 tests), `npx tsc --noEmit`, `npm run lint`, `npm run build` and `git diff --check` on September 28, 2026.

### Final automated checks

After the two follow-up review corrections:

- `npx vitest run`: 43 files, 367 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

### Follow-up browser check

The user explicitly confirmed the `.env.local` target as the development database before QA writes. This focused check exercised the changed flows; the earlier three-week walkthrough above was not repeated in full.

1. Created two disposable QA accounts with seeded study profiles and promoted the admin with the exported `makeAdmin` operation. Admin login landed on All students, which listed the student fixture and excluded the admin profile.
2. Used an LSAT Demon admin. Generated and approved sample analytics, then verified Rebuild this week was enabled on Progress and Study settings after the saved schedule loaded. Confirming rebuild from Study settings returned to This week with a saved schedule.
3. Moved to Next Monday and then Wednesday, September 30. Generated and approved an improving sample. The new weekly schedule marked Monday and Tuesday as unscheduled. The collapsed strip retained "Simulated" and September 30.
4. Inspected the dock at 1440 × 1000 and the panel at 390 × 844. "Past" and "Today" fit the weekday controls. Escape closed the mobile dialog and returned focus to the date button. The mechanical Impeccable detector reported no findings in the changed controls and analytics review.
5. Signed in as the student in a separate Chrome session. Seeded approved screenshot analytics for this fixture without calling OCR. The schedule used the real week of September 21 and showed no admin switcher, sample controls or simulated date. Its new check-ins had actual September 27 creation timestamps.
6. Reset test data returned the admin to the real date and retained the study profile. Reset everything returned the admin to onboarding. The student's weekly schedule, four activity check-ins and one analytics snapshot remained intact.
7. Signed out both sessions, reset the viewport override, removed the two QA accounts and all remaining fixture records, and stopped the development server. Cleanup confirmed zero QA users remained.

The save failure variants and skewed clocks were verified in automated regressions, not by inducing server failures or changing system time in the browser. No screenshot OCR request or physical-device/screen-reader test was performed.

### Follow-up reviews

- Standards: no outstanding actionable findings within the approved scope.
- Spec: the follow-up review caught network-error fallback and screenshot accessible-name gaps. Both received failing-then-passing regression tests and were verified by the reviewer after correction. No outstanding actionable findings remain within the approved scope.

### Deferred and approval-dependent work

Finding 4 remains deferred by user decision. Approvals made on different real days but the same simulated date can sort incorrectly because their simulated timestamps keep the real time of day. This can select the wrong latest snapshot and alter the performance trend. Changing the ordering policy requires a separate spec decision.

The walkthrough comment for issue 67 was drafted but never posted; issue 67 is now closed. ADR 0003 remains proposed. The work is committed in `97af8cc` and pushed to `main`. Issue 63 is closed; issues 59 and 64–67 remain open.
