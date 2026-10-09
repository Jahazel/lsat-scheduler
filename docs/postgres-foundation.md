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
application tables. Issue #96 owns that table design.

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
