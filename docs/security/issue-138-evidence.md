# Issue 138 controlled-move evidence

Date: October 16, 2026. Base: `b834851`.
Scope: [issue 138](https://github.com/Jahazel/lsat-scheduler/issues/138),
under [Stage 3](https://github.com/Jahazel/lsat-scheduler/issues/137).
Procedure: [controlled Neon move](../runbooks/controlled-neon-move.md).

## Tested locally

The SQL generator reads the exact checked migration files through Drizzle's own
migration reader. It emits owner SQL and never opens a database connection.
It records the same file hashes and journal timestamps as the installed normal
migration runner. No production host or override was added to the script guard.

The SQL-editor integration tests run the emitted SQL against separate throwaway
Postgres 17.11 databases on loopback. They prove:

- A fresh run creates the schema and records both migrations.
- A second run keeps the same journal and existing Account record.
- The real `scripts/migrate-postgres.mts` command then succeeds without changing
  the journal or trying to recreate the tables.
- Changed hashes, unknown rows, duplicates, and missing earlier rows are refused.
- A SQL failure rolls back both structure and bookkeeping. A later clean retry succeeds.
- A valid recorded prefix finishes without changing its existing journal row.

`npm run test:postgres` passed all 159 tests in 14 files. This includes the four
new SQL-editor tests and the existing limited-role tests. The role tests execute
`sql/app-role.sql`, rerun it, reconnect as the limited role, and verify refused
administration rights, object ownership, Weekly schedule updates, migration
bookkeeping access, and unrelated owner-table access.

The new command tests use invented direct and pooled Neon-shaped hosts. All five
entry points refuse before the connection-stop fixture runs: migration, make-admin,
reset, create-test-user, and copy check. Output omits the invented credentials.
The focused run passed five tests. These are regression tests for unapproved hosts.
They are **not** evidence for the eventual exact production hostname.

Commands:

```sh
node scripts/sql-editor-migrations.mjs
npm run test:postgres
npx vitest run scripts/productionHostRefusal.test.mjs
npm run typecheck
```

The Postgres command used only a loopback owner setting supplied to the process.
Each generated database was removed by test cleanup. No hosted records were read
or changed. Local raw logs are in `.verification/issue-138/` and are not committed.
The first SQL-editor test failed because the generator did not exist, then passed
with the generator. Type checking passed. Commit hooks passed lint, type checking, secret scanning,
and all 486 ordinary tests before commit `97deb72`.

## Required later observations

The owner confirmed in this session that **only the copy Neon project exists**.
The supplied `ep-restless-tooth-b42czg5d.c-6.us-east-2.aws.neon.tech` hostname is
already the approved copy host. It remains in the copy allowlist. No production
project was created by this work.

The owner approved moving exact production direct and pooled host refusal proof
to #143 on October 16, 2026. Both issue bodies now record that allocation. This
removes the dependency loop because #143 creates production after #138. Run the
procedure's credential-free refusal commands in #143 after those hosts exist.
The pre-release checklist explicitly requires this evidence. Do not replace it
with the copy hostname or a synthetic hostname. This remains a required check
before release, not a pass in this ticket.

Neon SQL-editor execution, provider password reset and hidden password entry,
provider privilege observations, final Atlas inventory, write pause, manual domain
assignment, both Admin sign-ins, backup freshness, and restore rehearsal remain
owner/provider work in #139 through #146. Local SQL tests prove transaction and
journal behavior. They do not prove provider permissions or web sign-in. No app
behavior changed, so a new browser run is not applicable to this ticket's change.

The procedure requires separate release and Atlas deletion approvals. Neither
occurred. The November 1, 2026 backup deadline and Stage 7 recovery work remain.

## Independent review

Two read-only Claude Opus 5.5 reviews at medium effort checked committed changes
against `origin/main`. Standards review found no hard violations and three low
duplication concerns. No abstraction was added for those concerns because the
existing explicit test setup is short and the integration test detects migration
configuration drift. Spec review found a missing psql certificate-root setting
and a missing explicit host-proof checklist row. Both were corrected. A follow-up
review checks these security-related documentation fixes and the owner's approved
issue allocation. Raw reviews remain in the local evidence directory.
