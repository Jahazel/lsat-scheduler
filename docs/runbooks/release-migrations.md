# Release migrations

Runbook for [issue 220](https://github.com/Jahazel/lsat-scheduler/issues/220). It applies
database migrations to the copy and to Neon production before a real-site release.
It does not approve a release. The [launch checklist](../security/release-gate.md) still applies.

## Words in this file

- **Migration**: one numbered SQL file in `migrations/`. It changes the database structure.
- **Journal**: the table `drillmap_migrations.applied`. It records each applied migration.
- **Migration role**: the database login `drillmap_migrator`. It owns the app tables and can
  change them. It cannot create roles or databases.
- **Neon owner**: `neondb_owner`, the role that Neon's console creates. Only the owner uses it,
  in Neon's browser SQL Editor.
- **Workflow**: the GitHub Actions file `.github/workflows/release-migrations.yml`.
- **Environment**: a GitHub setting that holds secrets for one job and can require approval.

## Accepted risk

The production password of the migration role lives in a GitHub secret. A leaked value can
delete all app data. Neon restore is the recovery. The owner accepted this on 2026-10-24
until launch approval. See [Accepted risks](../security/release-gate.md#accepted-risks).

These protections stay in place:

- The production job waits for the owner's **Approve** click.
- Only runs from `main` can read the production secret. Pull requests and forks cannot read it.
- The workflow refuses a database host that does not match its job. A copy secret cannot reach
  production, and a production secret cannot run in the copy job.
- The local scripts refuse both production hosts. Nobody keeps the migration password locally.
- Vercel builds never run migrations, so preview builds never reach production.
- The workflow installs packages without their install scripts. No install script runs in
  the job that reads the password.

## After every merge to `main` (automatic)

The copy follows `main`. Nobody needs to act.

1. The merge starts a **Release migrations** run. Its copy job applies new migrations to the copy
   and reapplies the app role's table permissions. Its production job is skipped.
2. Vercel builds the merged code for both sites. Neither site switches yet.
3. The `drillmap-copy` project waits for the GitHub check **Apply migrations to the copy** on the
   same commit (Vercel Deployment Checks). When it passes, Vercel switches the copy site to the
   new build. If it fails, the copy site keeps its old build.

If the copy site did not change after a merge, open the run in **Actions > Release migrations**
and read the copy job's last line (see [What the workflow refuses](#what-the-workflow-refuses)).

## Release order (production, by hand)

Production never changes on a merge. The `lsat-scheduler` project keeps automatic domain
assignment off, and the production job runs only from a manual run.

1. Confirm the commit to release is on `main`, its required checks pass, and the copy site serves it.
2. In GitHub, open **Actions > Release migrations > Run workflow**. Select `main`. Leave
   **Stop after the copy** off. Start the run.
3. The copy job runs again. It reports `New migrations: 0` when the merge run already applied them.
   If it fails, the run stops. Production is not touched.
4. The production job waits. Open the run and click **Review deployments > Approve**. Approve only
   the commit you will release.
5. Read the production job's last line. The journal row count must match the copy.
6. Assign the real domain to the deployment of the same commit in Vercel. Follow the
   [controlled move runbook](controlled-neon-move.md#release-gate-and-manual-domain-assignment).

A run with no new migrations is safe. It changes nothing and reports `New migrations: 0`.

### What the workflow refuses

The workflow uses the same SQL as the manual SQL Editor bundle. It runs as one transaction.
It refuses a changed, unknown, duplicate, or missing earlier migration and saves nothing. Read
the failed job's last line:

| Last line | Meaning | Action |
| --- | --- | --- |
| `Migration refused: Migration history does not match this version. Stop.` | A migration file changed after it was applied, or the journal holds an unknown row. | Stop. Do not edit the journal. Compare the files with the journal. |
| `The database host is not a copy host. Stop.` (or `production`) | The secret in that environment points at the wrong database. | Fix the secret. Do not rerun first. |
| `Migration failed with database error code …` | A migration statement failed. Nothing was saved. | Look up the code. Fix the migration in a new PR. |
| `Migration failed. Check the connection setting and migration files.` | The connection failed. | Check the secret and Neon's status. |

The logs show no connection string, password, host, or data value.

## One-time setup for each database

Do this once on the copy and once on production. Production setup can wait until the first
release that uses the workflow.

### 1. Create the migration role

In Neon's SQL Editor, select the project, branch, and database. Select the Neon owner.
Check `SELECT current_database(), current_user;`. Paste the whole
[`sql/migration-role.sql`](../../sql/migration-role.sql) and run it once.

It creates `drillmap_migrator` without a password and without administration rights. It moves
every app table, function, type, and the journal to the migration role. It lets the Neon owner
act as the migration role for the manual fallback. It refuses an existing role with
administration rights or memberships, and app objects owned by another role. A second run
changes nothing.

### 2. Set the migration password

Use the two-step method in the
[controlled move runbook](controlled-neon-move.md#set-the-app-password). Replace `drillmap_app`
with `drillmap_migrator`. Use the **direct** host, not the pooler. Use a new random value of at
least 32 characters, with letters, digits, and hyphens only.

### 3. Store the secret

Build this value:

```text
postgresql://drillmap_migrator:PASSWORD@DIRECT_HOST/neondb?sslmode=verify-full
```

Save it as the environment secret `MIGRATION_DATABASE_URL`:

| Database | GitHub environment | Who can read the secret |
| --- | --- | --- |
| Copy | `migrations-copy` | Runs from `main` (each merge and each manual run) and `migration-proof/*` branches, no approval |
| Production | `migrations-production` | Runs from `main` only, after the owner approves |

Run `gh secret set MIGRATION_DATABASE_URL --env <environment>` and paste the value at the hidden
prompt. Do not put it in a file, an issue, or a chat. Store it in the password manager.

## Manual fallback

Use this when GitHub Actions is down or the workflow refuses for an unclear reason.

1. Follow [Apply the owner SQL](controlled-neon-move.md#apply-the-owner-sql) as the Neon owner.
   The bundle switches to the migration role by itself, so the steps do not change.
2. Run `sql/app-role.sql`, then `sql/app-role-grants.sql`, as the Neon owner.
   `sql/app-role-grants.sql` also switches to the migration role by itself.

## Replace or remove the migration password

To replace it, repeat setup steps 2 and 3. To stop the workflow at once, delete the environment
secret. Then, as the Neon owner, remove the password and end the role's open sessions:

```sql
ALTER ROLE drillmap_migrator PASSWORD NULL;
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'drillmap_migrator';
SELECT count(*) FROM pg_stat_activity WHERE usename = 'drillmap_migrator';
```

The last query must return `0`. A removed password stops new logins only.
