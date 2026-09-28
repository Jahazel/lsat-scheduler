# Allow admins to rebuild their own current weekly schedule

Status: Proposed

[Issue 59](https://github.com/Jahazel/lsat-scheduler/issues/59) refines ADR-0001 for an admin's own student side. An admin may delete the current simulated week's weekly schedule and its activity check-ins, then recreate it from the current study settings and approved analytics, so the tutor can test scheduling changes without waiting another week. This exception requires a current database-verified admin role and the signed-in user's own Student; all real students' saved weekly schedules remain immutable.

Rebuild keeps earlier weeks, analytics snapshots, study settings and the simulated date. The two admin resets may delete the admin's test history and clear the simulated date; Reset everything also deletes their Student, while preserving their User and admin role. Schedule and check-in deletion runs in a transaction so a failed reset cannot leave orphaned activity check-ins.
