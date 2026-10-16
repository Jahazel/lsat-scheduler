# Persist immutable adaptive weekly schedules

DrillMap saves one immutable Adaptive weekly schedule per student and Monday–Sunday
calendar week, rather than regenerating a plan on each visit. Each Weekly schedule
records its generation inputs, approved Analytics snapshot references, progress facts,
capacity values, and Scheduling policy version. Activity check-ins remain separately
editable. Approved Analytics snapshots are append-only. Legacy analytics records belong
only to the old MongoDB database. The new Postgres database starts empty and never holds
a Legacy analytics record. This preserves historical trust and makes concurrent visits,
later uploads, and profile changes unable to rewrite a student's saved plan.

## Consequences

- Generation must be idempotent and protected by a unique `(studentId, weekStartDate)` constraint.
- The application must distinguish planned minutes from reported actual minutes.
- A fresh approved snapshot is required for a new plan. For `adaptive-weekly-schedule-v2`, ADR 0002 supersedes the original rule that only the Saturday practice test may exceed daily capacity.
- Apply the Postgres migrations before the first use of the persisted schedule path. No records move from the old database. This Stage 2 decision replaces the original requirement to migrate old indexes and Legacy analytics records. The [MongoDB history runbook](../runbooks/adaptive-weekly-schedules-rollout.md) records the earlier rollout only.
