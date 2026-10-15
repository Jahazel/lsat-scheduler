# Postgres foundation

Stage 2 moves the app to Postgres on the `stage2-postgres` integration branch.
Accounts, students, leads, and Analytics snapshots now use Postgres there.
Weekly schedule and Activity check-in storage, plus the remaining Admin reads,
still await their Stage 2 tickets. This intermediate branch must not reach
`main` until the remaining storage paths move together.

## Start local Postgres

Install Docker with Compose first. Docker runs a container, an isolated process
with its own files. From the repository root, run:

```sh
docker compose up -d --wait postgres
```

The container runs Postgres 17. It exposes port 5432 only at `127.0.0.1`.
It uses [Docker's official Postgres image on Amazon ECR Public](https://gallery.ecr.aws/docker/library/postgres).
This avoids Docker Hub's shared-runner download limit in GitHub tests.
This loopback address accepts connections from this computer only. Its volume
keeps local data when the container stops. The password `local-only` is a
public local example. Never use it on a hosted database.

Stop the container with `docker compose stop postgres`. If you already have
Postgres 17 installed, start it at a loopback address and create a `drillmap`
database instead. The tests need a local superuser, a login with full database
administration rights. They create and drop test databases and roles, and
test refusal of role membership. Docker and GitHub tests use `postgres`.

## Apply migrations

A migration is an ordered SQL file that changes the database structure.
Use the local example setting for this command:

```sh
DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5432/drillmap npm run db:migrate
```

The command checks the script host guard before it connects. Only loopback
and exact hosts in `scripts/copyDatabaseHosts.json` pass. That list is empty
until the owner approves a copy-site host. No setting bypasses this guard.

Migration files live in `migrations/`. Drizzle reads them in the order in
`migrations/meta/_journal.json`. Add each new numbered SQL file to that journal
with a later `when` value. Keep applied files and journal entries unchanged.
Drizzle records each file's hash and time in `drillmap_migrations.applied`.
It skips recorded migrations on later runs. The first migration adds no
application tables. Issue #96 adds the six domain tables in
`0001_domain_tables.sql`.

## Domain tables

All six tables create UUID ids with Postgres `gen_random_uuid()`. Accounts
keep the current email, name, optional password hash, role, and optional
Simulated date. Later migrations can add Stage 4 fields with `ALTER TABLE`.

| Table | Owner link and uniqueness |
| --- | --- |
| `accounts` | Unique normalized email |
| `students` | One student per Account through unique `account_id` |
| `leads` | Separate from Accounts, with its own unique normalized email |
| `analytics_snapshots` | Each Analytics snapshot belongs to a student |
| `weekly_schedules` | One Weekly schedule per student and `week_start_date` |
| `activity_check_ins` | One Activity check-in per `schedule_id` and `activity_id` |

Every owner link deletes its child records when the owner is deleted.
Deleting an Account therefore removes its student, Analytics snapshots,
Weekly schedules, and Activity check-ins. It keeps leads and other Accounts.
An Account can exist before onboarding creates its student.

Accounts and leads normalize emails on insert and update. Database checks
enforce the allowed role, platform, Accommodation, Preferred practice-test
day, and Activity check-in status. Seven student columns store Daily capacity.
They use the `daily_capacity_minutes` domain, a shared SQL value rule that
allows 30 to 480 minutes in 15-minute steps. Its exact numeric type prevents
Postgres from rounding fractional input into an allowed integer. Actual
minutes must be finite, nonnegative, and present only on a completed check-in.
A completed check-in can omit actual minutes.

The Weekly schedule, its generation inputs, and accuracy by question type use
`jsonb`, Postgres's JSON storage type. The app still validates their nested
shapes. `source_snapshot_ids` is a UUID array of reference data, with no foreign
keys. A schedule keeps the analytics it used inside `generation_inputs`.
Deleting a source Analytics snapshot leaves that saved history intact.

Analytics snapshots retain their approval, extraction, and confirmation facts.
Every snapshot in Postgres is approved, so there is no status or legacy column.
Legacy records remain a concern of the old MongoDB database only.

A trigger, database code that runs when a command reaches a table, refuses
every Weekly schedule update. It also refuses no-op and zero-row updates and
applies to the database owner. Insert and delete remain available for the
Admin rebuild behavior in ADR 0003. A second trigger refuses changes to an
Activity check-in's Weekly schedule or Schedule activity, while allowing
status and actual-minutes corrections.

Typed queries now serve Accounts, students, leads, and Analytics snapshots.
Snapshot-dependent Account deletion and Admin resets also use Postgres, so
they remove related records in one atomic operation or transaction. Later
tickets move the remaining schedule, check-in, and Admin read paths.

## Create the limited app role

After applying the migrations, run [the app role SQL](../sql/app-role.sql)
as the database owner. It selects the connected database, so it works with
any database name. For a local database, use `psql`, Postgres's command-line
client, with the owner's connection setting:

```sh
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file=sql/app-role.sql
```

On the Neon copy, the owner can paste the same file into Neon's SQL editor
while connected as the database owner. Create the app role through this SQL.
Neon grants its administration role, `neon_superuser`, to roles created
through its console, API, or CLI. See [Neon's role documentation](https://neon.com/docs/manage/roles).

The file creates `drillmap_app` with login permission and no password.
Set its password separately through `psql`'s interactive command:

```text
\password drillmap_app
```

The owner enters the password at the hidden prompt. For the Neon copy, use
a random password of at least 32 characters. Never put it in this SQL file,
another repository file, an issue, or a chat. The SQL keeps an existing
password when it runs again. Neon setup and checks belong to the later
Stage 2 copy-database ticket.

The role can connect, use the `public` schema, and select, insert, and delete
rows in all six domain tables. It can update every domain table except
`weekly_schedules`. The Weekly schedule trigger stays in place as a second
protection for the database owner. The app role cannot create roles,
databases, schemas, tables, temporary tables, or other schema objects.
It cannot alter, drop, truncate, or disable triggers on the domain tables.
This file grants no access to the migration bookkeeping or other tables.
UUID ids need no sequences, so this file grants no sequence permissions.
Future migrations must grant any new app-table permissions explicitly.

`PUBLIC` is Postgres's group of every role. Its permissions also apply to
the app role. The SQL removes `PUBLIC`'s database creation and temporary-table
permissions, schema creation permission, and permissions on the six domain
tables. Other logins that need those rights must receive explicit grants.
The database owner keeps its ownership rights. See [Postgres's grant rules](https://www.postgresql.org/docs/17/sql-grant.html).

The SQL rejects an existing role with administration rights, memberships in
other roles, or ownership of objects. A role with membership can switch to
another role even when automatic permission inheritance is off. Use a
separate SQL-created app role instead of an existing owner or console role.
The optional `drillmap.app_role` session setting changes the role name.
Tests use it to create a unique role and remove only their own role afterward.

## Use the shared connection

`src/lib/postgres.ts` is the only runtime reader of `DATABASE_URL`.
Server code and scripts use `getPostgresDatabase()` for Drizzle queries.
Its `transaction(async tx => ...)` method keeps all writes in one transaction.
Scripts call `closePostgresDatabase()` when they finish. Setup and cleanup
tools use `createPostgresConnection({ database })` for a second database on
the same server, then call that connection's `close()` method.

The app pool allows at most three connections per server process. It stays
cached across hot reloads and repeated function calls. Hosted functions have
separate pools, so use the provider's pooled endpoint when Stage 3 deploys
the Postgres app.

Loopback connections use no encryption. Every other host uses TLS, encrypted
transport with certificate and host-name checks. Remote strings can omit
`sslmode` or set `sslmode=verify-full`. Weaker modes fail before a connection
starts. `sslrootcert` can name a custom root certificate file. The module
builds explicit driver options so URL parameters cannot replace its checks.
See the [node-postgres SSL documentation](https://node-postgres.com/features/ssl).

The connection supports one host and an explicit user and database. Accepted
query options are `host`, `port`, `user`, `password`, `sslmode`, `sslrootcert`,
and `channel_binding`. Repeated and unknown options fail. The script guard
still reads multi-host strings to refuse unsafe targets before the driver.
Driver environment settings cannot replace the chosen host or TLS policy.

## Run Postgres tests

```sh
DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5432/drillmap npm run test:postgres
```

Test setup checks that every host is loopback before it connects. It creates
a database with a random `drillmap_test_` name, applies the repository's
migrations, and deletes that database after the run. It does not reset the
database named in the setting. The ordinary `npm test` command keeps running
the existing tests without needing Postgres.

GitHub runs the same Postgres command in its own job on every push and pull
request. That job starts a throwaway Postgres 17 container.

The app-role tests execute the repository SQL in a separate throwaway
database and open a real connection as that role. They generate its password
in memory. They test allowed writes, refused structure changes, orphan
inserts, Account deletion, and a second SQL run with a fresh login.
They disable the Weekly schedule trigger in their own database to prove
that missing update permission independently refuses updates. Owner-role
tests still prove that the trigger refuses updates too.
