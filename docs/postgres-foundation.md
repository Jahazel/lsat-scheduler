# Postgres foundation

Issue #95 adds the Postgres connection and migration tools. The current app
still uses MongoDB. Later Stage 2 tickets move its data access to Postgres.

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
database instead. The tests need a local role that can create databases.

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

Issue #97 adds the limited app role and its permission tests. Later tickets
add the typed queries and move the app to these tables.

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
