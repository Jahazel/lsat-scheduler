# Neon copy foundation check

Issue [#108](https://github.com/Jahazel/lsat-scheduler/issues/108), part of
[Stage 2](https://github.com/Jahazel/lsat-scheduler/issues/92).

The owner ran the check on **2026-10-16 at 13:44:00 UTC**. It passed.
This proves the database foundation on the copy. It does not approve a launch.

## Copy setup

- The owner created the separate Neon project `drillmap-copy` in AWS US East 2
  (Ohio), with no imported real data. The default branch is named `production`;
  it belongs to the copy project.
- The approved direct host is
  `ep-restless-tooth-b42czg5d.c-6.us-east-2.aws.neon.tech`. The committed host list
  allows only that remote host. It does not allow other Neon hosts or the pooled
  version of this host.
- The owner ran a SQL bundle in Neon's browser SQL editor. It used the repository
  migrations and `sql/app-role.sql`, and recorded the migrations' original hashes
  and journal times. The role was created through SQL, not the console's role
  creation controls.
- The owner generated a random 48-character password locally, set it on
  `drillmap_app` in Neon, and entered it at a hidden terminal prompt for the check.
  The agent did not receive the value. The setup and check helpers saved no
  password or connection string. No credential was added to a repository file,
  issue, or chat.
- This work created no real-site database project or deployment. Those remain
  Stage 3 work.

## Observed check result

The owner ran a local helper that supplied the copy's app connection to
`npm run --silent db:check-copy`. It selected `drillmap_app`, database `neondb`,
and `sslmode=verify-full`. The helper read the password without echoing it,
kept the connection setting only in process memory, and saved only safe output.
The owner shared this result, which also matches the local output file:

```text
PASS: Encrypted connection with certificate and host-name checks
PASS: App reads and writes
PASS: Limited role and immutable Weekly schedules
PASS: Database rules
PASS: Account deletion
PASS: Throwaway records rolled back
Checked at 2026-10-16 13:44:00 UTC
```

The check exercises all six app tables through the limited role. It checks
refused administration and structure changes, Weekly schedule update refusal,
owner links, unique records, allowed values, fixed Activity check-in links,
and Account deletion. Probe records run in a transaction that rolls back.

## Failure found and repaired

The first remote run failed at the encryption assertion. A safe diagnostic
confirmed successful login and these values:

```text
Server encryption status: [{"ssl":false}]
Client uses TLS: true
Client encryption active: true
Server certificate verified: true
```

The old assertion read `pg_stat_ssl` inside Postgres. That view describes the
backend connection, not the client connection to a TLS-terminating proxy.
The client evidence shows that those statuses differ on this Neon copy.
The checker now inspects a live pooled client's TLS socket and requires active
encryption and a verified certificate for a remote connection. The shared
connection module still requires certificate and host-name checks.
See [Node's TLS socket properties](https://nodejs.org/api/tls.html#tlssocketauthorized)
and [Postgres connection statistics](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW).

A local regression test puts a real TLS proxy in front of disposable Postgres.
The backend reports no encryption, while the client verifies the proxy's test
certificate. The test failed at the original assertion before the fix and passed
afterward. The full Postgres suite passed all 155 tests. The affected ordinary
connection and script tests passed all 57 tests, including rejection of an
untrusted certificate and a certificate for the wrong host. Type checking passed.

## Limits

This was a database command check. It did not test the app's browser paths,
backups, restores, alerts, provider account protection, or the real-site move.
Every launch checklist check stays `Not tested`. The no-promotion rule remains.
