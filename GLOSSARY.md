# DrillMap

The study-planning context for LSAT students using DrillMap. It defines the records that connect a student's planned work, reported progress, and approved 7Sage analytics across weeks.

## Language

### Records

**Weekly schedule**:
A saved Monday–Sunday study plan for one student and one calendar week. It is the historical record of work assigned for that week.
_Avoid_: schedule generation, plan template

**Schedule activity**:
One individually trackable item within a weekly schedule, such as an LR drill, RC drill, paired LR drill, full section, practice test, or review session. It shows as one line, labeled with its count, type, and difficulty, without its planned minutes. A student checks it off when it is done.
_Avoid_: task, to-do

**Activity check-in**:
A student's latest reported status for one schedule activity: not started or completed. One check-off marks it completed, and the student may undo it later without changing the planned activity.
_Avoid_: activity completion record

**Analytics snapshot**:
An approved, dated extraction of a student's 7Sage analytics. Snapshots are retained so performance can be compared across weeks. A screenshot snapshot needs both the LR and the RC screenshot; a `manual_entry` snapshot needs no screenshot. It holds 0 to 5 RC passage-type accuracies, one for each type that 7Sage shows a percentage for or that the student typed. Its source is `7sage_screenshot`, `admin_sample`, or `manual_entry` (values typed by hand). Every source passes the same save checks. Only the screenshot and sample sources must be read within 24 hours.
_Avoid_: current analytics, analytics upload

**Practice-test result**:
An approved reading of a student's four practice-test review screenshots, one per section: the PrepTest number, each section's 7Sage score, each LR question's result and tags, and the missed question type counts. A weekly upload holds at most one.
_Avoid_: PT score, test upload

**Missed question type**:
An LR question-stem type tagged on a question the student got wrong or left unanswered in a practice-test result. A question whose result the screenshot hides counts when its section score or the student settles it as missed. The type missed most goes first in the next weekly schedule, for that week only.
_Avoid_: weak type, error type

**Performance trend**:
A recency-weighted view of up to the three most recent approved analytics snapshots. Fewer snapshots are valid for a new student; the newest snapshot has the strongest influence.
_Avoid_: single-week result, lifetime average

**Adaptive weekly schedule**:
A weekly schedule shaped by the student's earlier weekly schedules, analytics snapshots, and latest practice-test result. It accounts for performance trends and recent misses, not for which activities were checked off.
_Avoid_: smart schedule, AI schedule

**Scheduling policy version**:
The named version of the deterministic rules used to create a weekly schedule. It is retained with the schedule so historical plans remain explainable and reproducible.

**Schedule reason**:
A saved code, placement, and short sentence recording why a weekly schedule departs from the student's normal week, such as a moved rest day or a missed question type that goes first. The sentence is written when the weekly schedule is created, so a past schedule keeps its original wording.
_Avoid_: explanation, rationale, note

**Legacy analytics record**:
An analytics record in the old database without the approval provenance required for adaptive planning. Legacy analytics records belong only to that database and never exist in the new database.

### Weekly shape

**Drilling day**:
A day in a weekly schedule that is not the rest day, a practice-test day, or a practice-test review day.
_Avoid_: study day, work day

**Rest day**:
The one day in a weekly schedule the scheduling policy keeps free of schedule activities. It moves off its usual day when a practice test or practice-test review day takes that day.
_Avoid_: off day

**Preferred practice-test day**:
The day of the week a student selects for their weekly practice test.
_Avoid_: PT day, test day

**Practice-test review day**:
The day after a practice test, reserved only for reviewing that test. It falls in the next weekly schedule when the practice test is on Sunday.
_Avoid_: Sunday review, blind review day

**Near-test week**:
A weekly schedule close enough to the student's goal test date to hold two practice tests instead of one, each taken on LawHub.
_Avoid_: crunch week, final month

**Unscheduled day**:
A day that had already passed when a weekly schedule was created, so it holds no schedule activities. It is not the rest day.
_Avoid_: empty day, missed day

### Student app

**This week**:
The student's current weekly schedule as a checklist of schedule activities, or the weekly upload that creates it when none exists yet. On Saturday and Sunday it reminds the student to plan next week until next week's weekly upload is confirmed.
_Avoid_: dashboard, current plan

**Weekly upload**:
The page where a student adds two analytics screenshots, four practice-test section screenshots, and their current score, then confirms what was read. Confirming saves the analytics snapshot, the practice-test result if there is one, and the current score together. An upload confirmed from Saturday onward is "Plan next week" and counts for the next weekly schedule. An upload confirmed Monday to Friday, when the week has no weekly schedule yet, is "Plan this week" and counts for the rest of the current week. When the week before the planned week had no practice test, it asks only for the analytics screenshots.
_Avoid_: weekly check-in, analytics upload

**Progress**:
The student's history across finished weeks: each past weekly schedule, newest first, opened read-in-place and read-only.
_Avoid_: history, past plans

**Official LSAT attempt**:
A real LSAT the student has taken, recorded during onboarding as a score with its month and year. It gives the tutor context; the weekly schedule does not use it.
_Avoid_: past LSAT, real test

**Study settings**:
The student's study profile: scores, goal test date, daily capacity, preferred practice-test day and accommodation. Changes apply to the next weekly schedule created.
_Avoid_: account settings, profile

**Account**:
The student's email and account deletion. It does not hold study settings.
_Avoid_: settings

**Disabled Account**:
An Account the owner has stopped without deleting its data. It cannot sign in, and its open sessions stop on their next request.
_Avoid_: banned account, locked account, suspended account

**Deleting Account**:
An Account whose student asked to delete it, while the deletion is not finished. It cannot sign in, and its open sessions stop on their next request. A sign-in or the daily job finishes the deletion. Nothing returns it to a working Account.
_Avoid_: pending deletion, soft-deleted account

**Deletion list**:
A short record of each deleted Account: its Account ID, a keyed hash of its email, and the date. It holds nothing else. Each row is deleted once it is more than 30 days old.
_Avoid_: tombstone, deleted accounts table

**Sign out of all devices**:
Ending every session of an Account at once, on every browser and device, including the current one. The ordinary "Sign out" ends only the current browser.
_Avoid_: sign out everywhere, global logout

**Sign-in method**:
How an Account signs in: Google or a password, never both. Admin Accounts use Google only.
_Avoid_: login type, provider, linked account

**Pending signup**:
A password signup whose email is not verified yet. It is not an Account and holds no data; using its verification link turns it into an Account.
_Avoid_: pending Account, unverified Account

**Recent sign-in**:
A sign-in within the last 10 minutes: a new Google sign-in for a Google Account, or the current password for a password Account. Account deletion and password change need one.
_Avoid_: re-authentication, fresh login

### Failures

**Unexpected failure**:
A server step that broke in a way the app did not plan for. The student is told "Something went wrong. Try again." with an error code.
_Avoid_: error, crash

**Planned refusal**:
A "no" the app means to give, such as "Wrong password" or a field that fails its check. It is not an unexpected failure and has no error code.
_Avoid_: error, validation error

**Error code**:
The 8-character code shown with an unexpected failure. The security log holds the same code, so the owner can find the failure from what the student reads out.
_Avoid_: error ID, reference number

**Failure toast**:
The floating notice that shows an unexpected failure and its error code over the current screen.
_Avoid_: error banner, error message, failure notice

### Capacity

**Daily capacity**:
The minutes a student says they can study on a given day of the week.
_Avoid_: availability, weekday capacity, weekend capacity

**Daily minimum**:
The smallest amount of LR or RC work every drilling day receives, even when it exceeds that day's daily capacity.
_Avoid_: floor, minimum drill

**Fill window**:
The range a drilling day's planned minutes must land in: from 10 minutes under its daily capacity to 30 minutes over. Work is added while the day is below its daily capacity, and only work that keeps the day inside the window. The daily minimum and full section are always placed. Practice-test days and practice-test review days have no fill window.
_Avoid_: fill limit, daily cap, available hours

**Day fill**:
A drilling day's planned schedule-activity minutes as a share of that day's daily capacity. The tutor uses it to judge whether assigned work differs too much between days.
_Avoid_: utilization, load

**Capacity overage**:
The minutes by which a day's planned schedule activities exceed its daily capacity. It is saved on the day for the tutor; the student sees no notice for it.
_Avoid_: overflow

**Accommodation**:
A student's approved extra-time category (standard, 1.5x, or 2x), which lengthens the planned time of their schedule activities.
_Avoid_: multiplier, extra time

### Drill content

**Full section**:
One complete LR or RC section from a practice test, done as a single schedule activity.
_Avoid_: section drill

**Starred question type**:
An LR question type the tutor ranks first for drilling.
_Avoid_: mandatory type, core type

**Drill**:
A schedule activity covering a set number of LR questions of one question type (two for a paired LR drill), or one or two RC passages. It is the unit the daily minimum and the drilling ratio are counted in.
_Avoid_: drill block, practice set

**Paired LR drill**:
One drill of 10 LR questions across two question types the tutor pairs, such as Necessary and Sufficient assumption. A weekly schedule holds two when the current score is 160 or higher and one otherwise, never more than one per drilling day.
_Avoid_: 5+5 unit, combo drill

**Drilling ratio**:
The fixed proportion of LR to RC drilling within one weekly schedule: 10 LR questions for every RC passage. Full sections and practice tests are counted separately.
_Avoid_: LR/RC balance, study-time split

**Starred rotation**:
The order that returns starred question types across successive weekly schedules, used when one weekly schedule cannot hold a drill of every starred question type.
_Avoid_: starred cycle, rotation schedule

### Admin

**Admin**:
One of the two people who run DrillMap. An admin can view every student's saved weekly schedule without changing it, and has a student side of their own for testing how the app behaves as weeks pass.
_Avoid_: tester, superuser

**Simulated date**:
The fixed "today" an admin sets for their own student side. It moves only forward and does not advance with real time, and it never affects real students or the admin's view of them. Resetting it returns the admin to the real date.
_Avoid_: test date, fake date, time travel

**Sample analytics snapshot**:
An analytics snapshot generated for an admin's student side instead of extracted from a 7Sage screenshot. The admin reviews and approves it in the weekly upload, like an uploaded snapshot.
_Avoid_: mock analytics, fake analytics
