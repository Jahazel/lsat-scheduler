# Adaptive weekly schedules production rollout

Run this release in the stated order. Each migration is idempotent and may be rerun after an interrupted deployment. Do not enable a feature flag or a parallel request-time schedule path after the migration is accepted.

1. Run the database migrations against the production `MONGODB_URI`:

   ```sh
   npm run migrate:analytics-snapshots
   npm run migrate:weekly-schedules
   npm run migrate:activity-check-ins
   ```

   The analytics migration marks pre-existing records as `legacy`, retains them as history, removes the old unique-per-student index, and never grants them planning eligibility.

2. Deploy the persistence and deterministic generation release.

3. Before directing dashboard or admin traffic to the replacement reads, run:

   ```sh
   ADAPTIVE_SCHEDULE_REPRESENTATIVE_STUDENT_ID=<student-id> npm run verify:adaptive-schedule-rollout
   ```

   Use a representative student with one migrated legacy snapshot, one approved snapshot, and a generated weekly schedule. The command verifies the append-only analytics index, unique weekly-schedule and activity-check-in indexes, confirms that the legacy unique analytics index is gone, validates that the selected legacy record retains migration provenance and cannot be mistaken for an approved snapshot, validates the saved schedule inputs, confirms a check-in exists, and reports the retained legacy-record count. Investigate any failure; do not continue the rollout.

4. Enable the replacement student dashboard load-or-generate path and the read-only admin path. There is no feature-flag period after the verification succeeds.

Validate with an existing student after step 4: a repeat dashboard visit returns the same weekly schedule, legacy analytics remain historical-only, a schedule activity check-in appears in both student views, and the admin view is read-only.
