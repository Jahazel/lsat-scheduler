# Controlled move to Neon

This is the procedure for issue #138 under [Stage 3](https://github.com/Jahazel/lsat-scheduler/issues/137).
It prepares a release. It does not approve a release, paid work, or Atlas deletion.
A cutover is the moment the real domain starts serving the Postgres build.
The owner executes provider actions. The agent records evidence without secrets.

## Prepare one version

- [ ] Record the full candidate commit, UTC date, owner, and both project names and IDs.
  Record branch, database, owner role, direct hostname, and pooled hostname for each.
  A pooled endpoint shares database connections. It is the app endpoint only.
- [ ] Confirm that the copy and production use separate Neon projects and separate
  Vercel projects. Branches of one Neon project do not satisfy this rule.
- [ ] Keep the real site's MongoDB build and Atlas project in place. Record the
  old deployment ID and its database before changing settings.
- [ ] Reconfirm with the owner that no real students exist. The October confirmation
  is prior evidence. It does not authorize new production work.
- [ ] Confirm provider two-step sign-in and recovery access under #139. Check the
  actual plan and permission limits. A missing capability stops its dependent step.
- [ ] Check out the exact candidate commit in a clean checkout. Run `npm ci`.
  Generate the owner SQL with `node scripts/sql-editor-migrations.mjs > /tmp/drillmap-owner-migrations.sql`.
  This command reads repository migrations. It never connects to a database or reads
  credentials. Record `git rev-parse HEAD`, `shasum -a 256 /tmp/drillmap-owner-migrations.sql`,
  `shasum -a 256 migrations/*.sql`, and the journal times from `migrations/meta/_journal.json`.
  Inspect the generated SQL before use. Regenerate and retest after any migration change.

## Keep scripts away from production

`scripts/copyDatabaseHosts.json` contains only approved copy hosts. Keep production
hosts, including pooled hosts, absent. Add no bypass flag, environment setting, or
production administration credential. Do not use `make-admin` on production.

As of October 16, 2026, the owner confirms that only the copy project exists.
`ep-restless-tooth-b42czg5d.c-6.us-east-2.aws.neon.tech` is its approved direct host.
The owner approved its pooled host, `ep-restless-tooth-b42czg5d-pooler.c-6.us-east-2.aws.neon.tech`,
on October 16, 2026, so `db:check-copy` can run through the hosted app's endpoint (#141).
The owner moved exact production-host refusal proof to #143 on October 16, 2026.
It remains required after that project exists and before release.
Do not mark that check passed with a made-up hostname or the copy hostname.

Once the owner identifies the production direct and pooled hosts, test both with
invented credentials through each real command. Never use a real connection string.
Use the connection-stop fixture so an accidental allow fails without a connection:

```sh
DATABASE_URL='postgresql://guard-user:guard-password@PRODUCTION_HOST/drillmap' \
  node --import tsx --import ./scripts/test-fixtures/stop-postgres-connection.mjs scripts/migrate-postgres.mts
DATABASE_URL='postgresql://guard-user:guard-password@PRODUCTION_HOST/drillmap' \
  node --import tsx --import ./scripts/test-fixtures/stop-postgres-connection.mjs scripts/make-admin.mts admin@example.test
```

Repeat for `reset-dev-data.mts --yes`, `create-test-user.mts`, and `check-neon.mts`.
Require exit 1 and `Refusing database host`. Exit 86 means the guard allowed the host.
Stop if any command reaches that boundary. Output must contain no invented password.
Record hostname, command, date, and safe refusal. These checks do not contact production.
Keep exact-host evidence with #143 and #146 before release.

## Apply the owner SQL

A migration changes the database structure. The journal records which migrations
have run. Drizzle is the library that reads that journal for the normal runner.

- [ ] In Neon's browser SQL editor, select the intended project, branch, database,
  and permanent owner role. Check `SELECT current_database(), current_user;`.
  Keep this owner's password out of local files, shell sessions, and Vercel.
- [ ] For a new database, inspect `pg_tables` and `pg_namespace`. Stop on unexplained
  application tables or migration state. Do not delete or overwrite them.
- [ ] Paste the entire generated SQL as one execution. Do not run selected fragments.
  It applies the exact checked files in journal order and records each original
  SHA-256 hash and millisecond journal time in `drillmap_migrations.applied`.
  One transaction makes the structure and journal succeed or fail together.
  A transaction is a group of changes that commits together or saves nothing.
- [ ] Compare the returned hash and time rows with the checked candidate. Require
  exactly one row per journal entry. The generated SQL rejects changed, unknown,
  duplicate, or missing earlier entries. It safely skips an already recorded prefix.
  Do not edit old migration files or hand-insert journal rows to suppress an error.
- [ ] If execution fails or the browser disconnects, reconnect and inspect the journal.
  Rerun the entire unchanged bundle after resolving the cause. It can finish an
  earlier valid prefix or skip a completed run. Stop on unexplained state.
- [ ] Apply the exact candidate's `sql/app-role.sql` as owner after migrations.
  It creates `drillmap_app` with no password and only app permissions. It refuses
  an existing role with administration powers, membership, or owned objects.
  Rerun this SQL unchanged to restore its intended grants. It preserves the password.

Neon grants administration membership to roles created through its role-creation
console, API, or CLI. Create the limited role with SQL instead.
See [Neon role rules](https://neon.com/docs/manage/roles).

### Enter the app password without SQL text

Use Neon's **Reset password** action for the SQL-created `drillmap_app` role.
This changes the password of the existing role. Do not use **Add role**.
The console generates the value. If it has at least 32 random characters, use it
as the app password. Otherwise use it only to enter an interactive `psql` session
as `drillmap_app`, then change that role's own password with the hidden prompt:

```sh
PGSSLMODE=verify-full PGSSLROOTCERT=system psql -X -h DIRECT_HOST -U drillmap_app -d DATABASE_NAME -W
```

Use Postgres 17 psql with its system trust store. Do not weaken certificate checks
if local trust setup fails. See [libpq certificate settings](https://www.postgresql.org/docs/17/libpq-connect.html#LIBPQ-CONNECT-SSLROOTCERT).
Enter the generated bootstrap password at the hidden login prompt. In `psql`, run
`\password drillmap_app` and enter a distinct random password of at least 32
characters from the password manager. Type `\q` to exit, then reconnect with `-W`
to prove the final password. This uses the limited app role, never the owner role.
It changes only that role's password. It does not run a repository script or allow
production migrations. If the provider refuses self-service password change, stop.
Do not weaken the script guard or enter the owner password locally.

Do not type `ALTER ROLE ... PASSWORD` in the browser SQL editor because its query
history can retain the secret. Do not save screenshots of secret screens. Keep
both passwords out of command arguments, environment variables, history, files,
and evidence. Remove the bootstrap value from the clipboard after replacement.
Store the final value only in the password manager and the matching project's
approved secret settings. On a local throwaway database, use the same hidden
`\password` prompt. Postgres documents its hidden prompt and safe password command
in the [psql manual](https://www.postgresql.org/docs/17/app-psql.html).

Reconnect as the app role and repeat the permission checks after password setup.
Require no administration flags, memberships, owned objects, or access to the
migration journal and other owner-only tables. Require no Weekly schedule update
permission and the immutable trigger. Run `db:check-copy` on the approved copy only.
Do not run it against production. #143 records equivalent owner observations there.

Neon documents console password reset separately from role creation in its
[role management guide](https://neon.com/docs/manage/roles#reset-a-password).
Actual password length, self-service password change, and unchanged memberships need
owner observation on Neon.

## Grant Admin access as owner

Wait for #140's Google identity protections before using this step. Do not grant
Admin access to an Account created through password signup. Both intended Admins
must have checked and dated Google two-step verification and verified Google email.

Each person signs in through Google. The owner identifies the exact Account ID and
stable Google ID through owner-only access. Do not select by email alone or copy
Atlas IDs or password hashes. Confirm the candidate's current identity column names
from #140, then record an exact, reviewed SQL grant for that candidate. Stop if the
identity cannot be verified. As owner, grant only that Account the Admin role and
clear any password hash in one transaction. Require exactly one updated row.
Use this transaction after replacing the example UUID with the verified Account ID:

```sql
BEGIN;
DO $$
BEGIN
  UPDATE public.accounts SET role = 'admin', password_hash = NULL
  WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The verified Account does not exist. Stop.';
  END IF;
END;
$$;
COMMIT;
```

The primary key limits this to one Account. Inspect the role and absence of a
password hash through owner access after commit. Rerun with the same verified identity to leave the same result. Do not grant an
administration database role to an app Account. Have each Admin sign out and sign
in again. Require correct Admin access and no password sign-in. #141 and #146 hold
the copy and real-site results. No local production command replaces this step.

## Temporary access only if a job requires it

The current move needs no temporary script administration access. Keep it absent.
If a later job needs it, record the specific job and minimal privileges first.
Keep production script refusal intact. Do not grant the app role membership.
Use a unique SQL-created role with no ownership or administration membership.
Set `VALID UNTIL` to an explicit UTC time no more than seven days after creation.
Use hidden password entry, never a saved query, file, Vercel setting, chat, or log.
If hidden entry is unavailable, stop. Password expiry limits password login only.

After that authorized job, the owner must perform all of these steps:

1. `ALTER ROLE exact_temporary_role NOLOGIN PASSWORD NULL;`
2. `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'exact_temporary_role' AND pid <> pg_backend_pid();`
3. Revoke every granted membership. In each database where it has privileges, run
   `DROP OWNED BY exact_temporary_role` only after checking that it owns no objects.
   Stop and inspect unexpected ownership. Never use `CASCADE` to remove dependencies.
4. `DROP ROLE IF EXISTS exact_temporary_role;`
5. Confirm no matching role or sessions remain. Record the date and safe result.

After an interrupted cleanup, start again with the role/session existence check.
Skip already absent resources. An expired password does not end existing sessions.
See [Postgres ALTER ROLE](https://www.postgresql.org/docs/17/sql-alterrole.html).

## Pause writes and take the final inventory

- [ ] Before the final inventory, stop every old write path. This includes the real
  domain, old deployment URLs, previews with old credentials, Admin operations, and
  background jobs. A maintenance page on the real domain alone is insufficient.
  Revoke the old app login's write access and end its sessions through Atlas owner
  controls. Keep owner read access for inventory. Prove a new old-app write fails.
  Record the pause time and preserve a reviewed way to restore access if stopped.
- [ ] In Atlas owner-only access, list **every database and collection**, including
  unknown collections. Run exact counts after the pause. Do not use estimated
  counts or copy personal values into evidence. Record collection name, count,
  record classification, owner reviewer, and UTC time.
- [ ] Include `users` for Accounts, `students`, `leads`, `analyticssnapshots`,
  `weeklyschedules`, and `activitycheckins`. Confirm actual names in Atlas.
  Check all Account roles, password/Google identities, students, Legacy analytics
  records, Analytics snapshots, Weekly schedules, and Activity check-ins. Count
  orphaned dependent records as well. Classify expected owner/test records only
  through explicit owner review. Unknown records, real students, or unexplained
  dependent records stop the empty-database plan. Keep writes paused while the
  owner decides. This ticket permits no data migration or deletion.
- [ ] In production Postgres, count all six domain tables and inspect all other
  application tables. It must be empty before the planned fresh Account creation.
  Stop on unexpected records. Record owner-approved test/Admin records created
  afterward separately. Never copy old Accounts, IDs, passwords, or dependent data.
- [ ] Keep the old database write pause in place from inventory through the move.
  Repeat inventory if write access returns or its status is uncertain.

## Release gate and manual domain assignment

Follow [the release checklist](../security/release-gate.md). No check below is passed
merely because this document exists.

- [ ] Keep automatic custom production domain assignment off. Prove a new build
  does not move the real domain on the copy rehearsal and in real-project settings.
- [ ] Assemble the exact commit and deployment ID, green required checks, hosted
  copy results, fresh inventory, role/identity proof, production backup proof,
  provider access evidence, exact direct and pooled production-host refusal results
  from #143 for all five guarded commands, disclosure changes, and this recovery plan. Include
  unresolved launch gaps. The latest actual production snapshot must be at most
  24 hours old. Daily snapshots, retention at most 30 days, the monitor, missed-run
  detection, alert delivery, and the copy restore rehearsal must already work.
- [ ] Stop before cutover on any failed, missing, stale, or inconclusive required
  check. This procedure grants no release-check exception. Only an owner-recorded
  permitted exception can state its risk, reason, substitute protection, and end date.
- [ ] Obtain owner approval for the **exact** commit, deployment, database, real
  domain, and recovery limits. A merge or successful build is not that approval.
  Keep the no-promotion rule and interim Anthropic controls. Confirm production
  uses no fake extraction. Paid extraction tests need separate authorization.
- [ ] The owner manually assigns the real domain to the approved deployment.
  Confirm the domain, deployment ID, and database target after assignment.
  Run only approved bounded live checks with approved test Accounts and Sample
  analytics snapshots. Verify both Admins with fresh Google sign-in.

Vercel documents manual promotion and its effect on production domains in
[Promoting deployments](https://vercel.com/docs/deployments/promoting-a-deployment).
Check the actual project controls before following them.

## Recovery

| State | Safe recovery action |
| --- | --- |
| Before domain assignment | Stop. Keep or restore the old MongoDB deployment on the domain. Reopen old writes only after the owner confirms no Postgres writes occurred and approves restoring old access. Repeat inventory before a later attempt. |
| Domain assigned, proven no new Postgres records | Pause access. With owner approval, reassign the domain to the recorded MongoDB deployment with its Atlas settings. Confirm Atlas exists and access works before reopening. |
| Postgres accepted any new records, or this is uncertain | Pause writes. Preserve Neon and Atlas. Prefer repairing the Postgres build or an owner-approved compatible Postgres deployment. Do not reopen Atlas writes or discard new Postgres data. The owner must decide reconciliation or accepted loss before recovery. |
| Neon restore needed | Use the tested isolated Neon restore procedure from #144. Record source time, counts, recovery time, and any lost writes. Obtain owner approval before changing the app connection or domain. Recheck both Admins and backups before reopening. |

A MongoDB build cannot use Postgres. Pointing it at a Postgres connection does not
make it compatible. A Vercel rollback changes code and domain routing. It does not
restore database contents. Review the settings used by the destination deployment.
The recovery target is at most one day of lost data and 48 hours to recover.
Stage 7 must rehearse full recovery, credential rotation, five alert tests, and
post-restore deletion replay. Stage 6 implements deletion replay first.

## Atlas retirement is a separate gate

Retain Atlas and the old deployment until both Admins work on Neon, bounded live
checks pass, and production backup proof remains current. Obtain **separate owner
approval** under #147 for the exact Atlas project deletion. Stop old traffic, remove
obsolete access and settings, and record the provider's deletion result without
secrets. Deletion removes the old MongoDB rollback path. Keep a tested Neon recovery
path. This procedure authorizes no Atlas deletion.

The no-backup risk acceptance ends **November 1, 2026**, or earlier when daily
backups run. If the move is not ready, stop and obtain an interim backup decision
or a dated renewed acceptance before that deadline. This document renews nothing.

## Evidence record

Record UTC date, candidate commit, generated SQL hash, executor, project/branch,
command or provider action, expected result, actual result, and remaining work.
Use counts and classifications. Omit emails, Google IDs, passwords, connection
strings, cookies, recovery codes, and secret screens. Distinguish local rehearsal,
copy observations, and production observations. See issue 138 evidence.
