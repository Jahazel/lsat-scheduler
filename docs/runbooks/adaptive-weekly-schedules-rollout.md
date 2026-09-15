# Adaptive weekly schedules production rollout

Use this runbook when releasing to a database that already contains data from
the pre-adaptive-schedule application. Each migration is idempotent and may be
rerun after an interrupted deployment. The application has no feature flag or
parallel request-time schedule path.

1. Make `MONGODB_URI` available to the commands, then run the database migrations:

   ```sh
   node --env-file=.env.local scripts/migrate-analytics-snapshots.mjs
   node --env-file=.env.local scripts/migrate-weekly-schedules.mjs
   node --env-file=.env.local scripts/migrate-activity-check-ins.mjs
   ```

   In a hosted environment, set `MONGODB_URI` in that command environment
   instead of using `.env.local`.

   The analytics migration marks pre-existing records as `legacy`, retains them as history, removes the old unique-per-student index, and never grants them planning eligibility.

2. Deploy the persistence and deterministic generation release.

3. For a database that contained old analytics, run the representative-record
   verification after deployment:

   ```sh
   ADAPTIVE_SCHEDULE_REPRESENTATIVE_STUDENT_ID=<student-id> \\
     node --env-file=.env.local scripts/verify-adaptive-schedule-rollout.mjs
   ```

   Use a representative student with one migrated legacy snapshot, one approved snapshot, and a generated weekly schedule. The command verifies the append-only analytics index, unique weekly-schedule and activity-check-in indexes, confirms that the legacy unique analytics index is gone, validates that the selected legacy record retains migration provenance and cannot be mistaken for an approved snapshot, validates the saved schedule inputs, confirms a check-in exists, and reports the retained legacy-record count. Investigate any failure; do not continue the rollout.

4. For a fresh, empty database, the representative-record command is not
   applicable because there is no migrated legacy analytics record. Instead,
   create a test student, confirm an analytics upload, load the dashboard to
   create a schedule, and verify the browser behavior below. The migrations
   still create the required database indexes.

Validate after deployment: a repeat dashboard visit returns the same weekly
schedule, legacy analytics remain historical-only when they exist, a schedule
activity check-in appears in both student views, and the admin view is
read-only.
