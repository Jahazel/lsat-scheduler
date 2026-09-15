# Persist immutable adaptive weekly schedules

DrillMap will save one immutable adaptive weekly schedule per student and Monday–Sunday calendar week, rather than regenerating a plan on each visit. Each plan records its generation inputs, approved analytics snapshot references, progress facts, capacity values, and scheduling policy version; activity check-ins remain separately editable. Approved analytics are append-only, while migrated legacy records are excluded from planning. This preserves historical trust and makes concurrent visits, later uploads, and profile changes unable to rewrite a student's saved plan.

## Consequences

- Generation must be idempotent and protected by a unique `(studentId, weekStartDate)` constraint.
- The application must distinguish planned minutes from reported actual minutes.
- A fresh approved snapshot is required for a new plan; a full Saturday practice test is the only planned-work capacity exception.
- An existing database must migrate its indexes and legacy analytics before its first use of the persisted schedule path.
