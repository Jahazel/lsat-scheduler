# DrillMap

The study-planning context for LSAT students using DrillMap. It defines the records that connect a student's planned work, reported progress, and approved 7Sage analytics across weeks.

## Language

### Records

**Weekly schedule**:
A saved Monday–Sunday study plan for one student and one calendar week. It is the historical record of work assigned for that week.
_Avoid_: schedule generation, plan template

**Schedule activity**:
One individually trackable item within a weekly schedule, such as an LR drill, RC drill, practice test, or review session. A student can report it as not started, completed, or skipped.
_Avoid_: task, to-do

**Activity check-in**:
A student's latest reported status and optional actual minutes for one schedule activity. The student may correct it later without changing the planned activity.
_Avoid_: activity completion record

**Analytics snapshot**:
An approved, dated extraction of a student's 7Sage analytics. Snapshots are retained so performance can be compared across weeks.
_Avoid_: current analytics, analytics upload

**Performance trend**:
A recency-weighted view of up to the three most recent approved analytics snapshots. Fewer snapshots are valid for a new student; the newest snapshot has the strongest influence.
_Avoid_: single-week result, lifetime average

**Adaptive weekly schedule**:
A weekly schedule shaped by the student's earlier schedule activities and analytics snapshots. It accounts for both reported progress and performance trends.
_Avoid_: smart schedule, AI schedule

**Scheduling policy version**:
The named version of the deterministic rules used to create a weekly schedule. It is retained with the schedule so historical plans remain explainable and reproducible.

**Schedule reason**:
A saved code, placement, and short sentence recording why a weekly schedule departs from the student's normal week, such as a skip reduction or a capacity overage. The sentence is written when the weekly schedule is created, so a past schedule keeps its original wording.
_Avoid_: explanation, rationale, note

**Legacy analytics record**:
An analytics record carried forward from the previous storage model without the approval provenance required for adaptive planning. It may remain visible as history but cannot qualify a student for a new weekly schedule.

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
The student's current weekly schedule, where they check in activities, or the analytics upload that creates it when none exists yet.
_Avoid_: dashboard, current plan

**Progress**:
The student's history across finished weeks: completion stats and each past weekly schedule, opened read-in-place.
_Avoid_: history, past plans

**Study settings**:
The student's study profile: scores, goal test date, daily capacity, preferred practice-test day and accommodation. Changes apply to the next weekly schedule created.
_Avoid_: account settings, profile

**Account**:
The student's email and account deletion. It does not hold study settings.
_Avoid_: settings

### Capacity

**Daily capacity**:
The minutes a student says they can study on a given day of the week.
_Avoid_: availability, weekday capacity, weekend capacity

**Daily minimum**:
The smallest amount of LR or RC work every drilling day receives, even when it exceeds that day's daily capacity.
_Avoid_: floor, minimum drill

**Fill limit**:
A drilling day's daily capacity after any skip reduction. The daily minimum and full section count toward it and can exceed it; other work is added only while the day stays within it.
_Avoid_: daily cap, available hours

**Day fill**:
A drilling day's planned schedule-activity minutes as a share of that day's daily capacity. The tutor uses it to judge whether assigned work differs too much between days.
_Avoid_: utilization, load

**Capacity overage**:
The minutes by which a day's planned schedule activities exceed its daily capacity.
_Avoid_: overflow

**Accommodation**:
A student's approved extra-time category (standard, 1.5x, or 2x), which lengthens the planned time of their schedule activities.
_Avoid_: multiplier, extra time

**Skip reduction**:
The cut to a weekly schedule's planned work, sized by the share of planned minutes the student skipped in the immediately preceding week. It never reduces a drilling day below its daily minimum.
_Avoid_: workload reduction, penalty

### Drill content

**Full section**:
One complete LR or RC section from a practice test, done as a single schedule activity.
_Avoid_: section drill

**Starred question type**:
An LR question type the tutor ranks first for drilling.
_Avoid_: mandatory type, core type

**Drill**:
A schedule activity covering a set number of LR questions of one question type, or a set number of RC passages. It is the unit the daily minimum and the drilling ratio are counted in.
_Avoid_: drill block, practice set

**Drilling ratio**:
The fixed proportion of LR to RC drilling within one weekly schedule: 10 LR questions for every RC passage. Full sections and practice tests are counted separately.
_Avoid_: LR/RC balance, study-time split

**Starred rotation**:
The order that returns starred question types across successive weekly schedules, used when one weekly schedule cannot hold a drill of every starred question type.
_Avoid_: starred cycle, rotation schedule
