# Postgres foundation

Stage 2 moves the app to Postgres on throwaway data.
Accounts, students, leads, Analytics snapshots, Weekly schedules, and Activity
check-ins now use Postgres. This week, Progress, and the Admin area use these
records. Deployment and the real-site database move remain Stage 3 work.

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

Stop the container with `docker compose stop postgres`.

### Homebrew on macOS

Use this option instead of Docker when
[Homebrew manages your local Postgres](https://formulae.brew.sh/formula/postgresql@17).
Install Postgres 17 if needed, then start it:

```sh
brew install postgresql@17
brew services start postgresql@17
```

Homebrew creates a database login with your macOS username. Its default
connections stay on this computer. Set an explicit IPv4 loopback address,
then restart the service:

```sh
"$(brew --prefix postgresql@17)/bin/psql" -d postgres --set ON_ERROR_STOP=1 \
  -c "ALTER SYSTEM SET listen_addresses = '127.0.0.1'"
brew services restart postgresql@17
"$(brew --prefix postgresql@17)/bin/pg_isready" -h 127.0.0.1 -p 5432
```

If the readiness check reports `no response`, repeat it until it reports
`accepting connections` before running the next command.

Create the local app database once:

```sh
"$(brew --prefix postgresql@17)/bin/createdb" -h 127.0.0.1 -p 5432 drillmap
```

In `.env.local`, replace `MONGODB_URI` with the following setting. Replace
`YOUR_MACOS_USERNAME` with the output of `whoami`. Remove any other MongoDB
or Neon connection settings. Keep the existing local Auth.js and Google values.

```dotenv
DATABASE_URL=postgresql://YOUR_MACOS_USERNAME@127.0.0.1:5432/drillmap
```

Homebrew's default local login needs no password. Use it only on this computer.
The tests need a local superuser, a login with full database
administration rights. They create and drop test databases and roles, and
test refusal of role membership. Homebrew uses your macOS login. Docker and
GitHub tests use `postgres`.

Apply migrations using the rewritten local file, then run the Postgres tests:

```sh
node --env-file=.env.local --import tsx scripts/migrate-postgres.mts
DATABASE_URL="postgresql://$(whoami)@127.0.0.1:5432/drillmap" npm run test:postgres
```

Stop the service with `brew services stop postgresql@17`. Start it again
with `brew services start postgresql@17`. The service also starts at login.
Keep the old MongoDB data until a separate cleanup task authorizes deletion.

## Apply migrations

For the later production move, use the [controlled move procedure](runbooks/controlled-neon-move.md).
It preserves the production script refusal and prepares exact-version owner SQL.

A migration is an ordered SQL file that changes the database structure.
Use the local example setting for this command:

```sh
DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5432/drillmap npm run db:migrate
```

The command checks the script host guard before it connects. Only loopback
and exact hosts in `scripts/copyDatabaseHosts.json` pass. That list contains
only owner-approved copy-site hosts. No setting bypasses this guard.

Migration files live in `migrations/`. Drizzle reads them in the order in
`migrations/meta/_journal.json`. Add each new numbered SQL file to that journal
with a later `when` value. Keep applied files and journal entries unchanged.
Drizzle records each file's hash and time in `drillmap_migrations.applied`.
It skips recorded migrations on later runs. The first migration adds no
application tables. Issue #96 adds the six domain tables in
`0001_domain_tables.sql`.

## Domain tables

All seven tables create UUID ids with Postgres `gen_random_uuid()`. Accounts
keep the current email, name, optional password hash, role, and optional
Simulated date. Later migrations can add Stage 4 fields with `ALTER TABLE`.

Since `0012_password_sign_in.sql`, each Account has exactly one sign-in
method: a password hash or a Google ID, never both and never neither. An Admin
never has a password hash. Two more tables serve password sign-in. A pending
signup is keyed by its normalized email and is not an Account. A reset token
belongs to one Account and is deleted with it. Both store only a hash of the
emailed token. See [ADR 0006](adr/0006-pending-signups-live-outside-the-accounts-table.md).

| Table | Owner link and uniqueness |
| --- | --- |
| `accounts` | Unique normalized email |
| `students` | One student per Account through unique `account_id` |
| `leads` | Separate from Accounts, with its own unique normalized email |
| `analytics_snapshots` | Each Analytics snapshot belongs to a student |
| `practice_test_results` | Each Practice-test result belongs to a student |
| `weekly_schedules` | One Weekly schedule per student and `week_start_date` |
| `activity_check_ins` | One Activity check-in per `schedule_id` and `activity_id` |

Every owner link deletes its child records when the owner is deleted.
Deleting an Account therefore removes its student, Analytics snapshots,
Practice-test results, Weekly schedules, and Activity check-ins. It keeps leads and other Accounts.
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
Legacy records stayed in the old MongoDB database, which the app no longer reads.

A trigger, database code that runs when a command reaches a table, refuses
every Weekly schedule update. It also refuses no-op and zero-row updates and
applies to the database owner. Insert and delete remain available for the
Admin rebuild behavior in ADR 0003. A second trigger refuses changes to an
Activity check-in's Weekly schedule or Schedule activity, while allowing
status and actual-minutes corrections.

Typed queries now serve Accounts, students, leads, Analytics snapshots, Weekly
schedules, and Activity check-ins.
Snapshot-dependent Account deletion and Admin resets also use Postgres, so
they remove related records in one atomic operation or transaction. All
students reads each student with its Account's name and email in one join.

## Create the limited app role

After applying the migrations, run [the app role SQL](../sql/app-role.sql)
and then [the app table grants](../sql/app-role-grants.sql) as the database
owner. They select the connected database, so they work with any database name.
For a local database, use `psql`, Postgres's command-line client, with the
owner's connection setting:

```sh
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file=sql/app-role.sql
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file=sql/app-role-grants.sql
```

The table grants are a separate file because only the table owner can change
them. On Neon, the [migration role](runbooks/release-migrations.md) owns the
tables, and the release workflow reapplies the grants after each migration.

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
Stage 2 copy-database setup ticket.

The role can connect, use the `public` schema, and select, insert, and delete
rows in all seven domain tables. It can update every domain table except
`weekly_schedules` and most of `accounts`. On `accounts`, it inserts only
`email`, `name`, `google_id`, and `password_hash`, and updates only
`simulated_date`, `session_version`, and `password_hash`. It reads, inserts,
updates, and deletes pending signups and reset tokens. Only the owner may give the Admin role, disable an
Account, or change its Google ID. The Weekly schedule trigger stays in place as a second
protection for the database owner. The app role cannot create roles,
databases, schemas, tables, temporary tables, or other schema objects.
It cannot alter, drop, truncate, or disable triggers on the domain tables.
This file grants no access to the migration bookkeeping or other tables.
UUID ids need no sequences, so this file grants no sequence permissions.
Future migrations must grant any new app-table permissions explicitly.

`PUBLIC` is Postgres's group of every role. Its permissions also apply to
the app role. The SQL removes `PUBLIC`'s database creation and temporary-table
permissions, schema creation permission, and permissions on the seven domain
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

## Check the Neon copy

After migrations and app-role setup, run the check with the app login:

```sh
npm run db:check-copy
```

Supply `DATABASE_URL` through the shell session. The command does not read an
environment file. The owner must enter the Neon credential outside agent chat
and evidence files. Never paste it into an issue or commit it.

Neon's connection string ends with `sslmode=require`. Change it to
`sslmode=verify-full` before the run. Otherwise the check stops with
"Remote Postgres requires sslmode=verify-full." That message holds no secret.
Every other failure prints only "Database foundation check failed." so no
connection string, password, or host detail reaches the output.

The script runs the host guard before it connects. Loopback and exact copy-site
hosts in `scripts/copyDatabaseHosts.json` are the only allowed targets. The list
contains only owner-approved copy-site hosts. It has no bypass setting.

The check uses the shared app driver. A remote connection must use encryption
with certificate and host-name checks. The check inspects the driver's live TLS
socket and its certificate-verification result. Neon's proxy ends the client's
encrypted connection before forwarding it to Postgres, so `pg_stat_ssl` inside
Postgres does not prove whether the client connection is encrypted.
Local runs explicitly report that remote encryption remains untested.

The command checks app reads and writes on all seven tables, refused role,
database, and table creation, immutable Weekly schedules, owner links,
uniqueness, invalid values, fixed Activity check-in ownership, and Account
deletion. Each run uses randomly named throwaway records. Every record change
runs in one transaction that rolls back on success or failure. Existing records
stay unchanged. The database-creation refusal runs outside that transaction
because Postgres requires it. The script checks for administration rights first.

Success prints fixed `PASS` messages and exits with code 0. A failed check exits
with code 1. It prints no raw database errors, password, or connection string.
The local Postgres tests run this same command and check successful repeats,
broken permissions, a broken deletion rule, and secret-bearing database errors.
Record the date and safe output when the owner runs it on the Neon copy.
