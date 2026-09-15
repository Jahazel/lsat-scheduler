# DrillMap

The study-planning context for LSAT students using DrillMap. It defines the records that connect a student's planned work, reported progress, and approved 7Sage analytics across weeks.

## Language

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

**Legacy analytics record**:
An analytics record carried forward from the previous storage model without the approval provenance required for adaptive planning. It may remain visible as history but cannot qualify a student for a new weekly schedule.
