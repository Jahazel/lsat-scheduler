# Fill drilling days to a fill window

Status: accepted. This ADR supersedes ADR 0002's sentence that the policy shows the student the capacity-overage schedule reason, and ADR 0001's consequence that the application must distinguish planned minutes from reported actual minutes.

The tutor asked for drilling days filled close to the student's daily capacity, at most 30 minutes over and never cut after a skipped week ([spec #191](https://github.com/Jahazel/lsat-scheduler/issues/191), tutor answers of 2026-10-19 and 2026-10-20). Policy `adaptive-weekly-schedule-v3` replaces the fill limit, the skip reduction, and the capacity-overage notice with one fill window. A drilling day's planned total lands between its daily capacity minus 10 minutes and its daily capacity plus 30 minutes. The engine adds units while the day is below its daily capacity, and only units that keep the day at or below capacity plus 30 minutes. The daily minimum and the full section are always placed. Practice-test days and practice-test review days have no limit and no notice, because a full test and its review must never be cut.

The skip reduction goes with the fill limit: v3 reads no prior-week progress facts and writes no `skip_reduction` schedule reason. The engine still records a day's capacity overage on its day plan for the tutor, but writes no `capacity_overage` schedule reason, and This week hides that reason on saved v2 schedules. An activity check-in is now only not started or completed, so a weekly schedule no longer stores or compares actual minutes.

## Consequences

- Saved v1 and v2 weekly schedules keep their saved plans and reasons; ADR 0001's persistence decision remains in force.
- Unfinished work no longer shrinks the next weekly schedule.
- A day may show more planned time than its daily capacity with no warning. The day header still shows the planned total against the daily capacity.
