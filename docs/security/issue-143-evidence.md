# Issue 143 evidence

Recorded with a one-off local wizard, 2026-10-18 19:09 UTC to 2026-10-18 21:07 UTC.
These are production observations by the owner, except where a row says the wizard ran a local command.
This file holds no password, secret, connection string, email, or client ID.

## Version and project

- Candidate commit: `143c29da6845637fca9c175a65a94127cadebd7f`
- Setup SQL SHA-256: `8d30aed734bb09faa734f5f1a13ff8bfc6fd253eaa2e765b7e1905a09c2bc6f9`
- Migration files SHA-256: `fe1c998e0097c4442b47a550b5861efb5711d3e71b5e4886640018d2b76eccc1  migrations/0000_migration_bookkeeping.sql`, `eae5b154936af65959028e1d0ce612ccae8d10459599a6041ea87e6f461cf57b  migrations/0001_domain_tables.sql`, `295559542a0d441b06c163f72682df52a8830e9ce251934110d50c6261ae5291  migrations/0002_google_identity.sql`
- `sql/app-role.sql` SHA-256: `b2689bf2e9fb6ad024e563aa537b0127a604996f1c60db228228a70b5d7c6ee6`
- Neon project `drillmap-production`, ID `weathered-field-02809409`, Postgres 18.6, database `neondb`, owner role `neondb_owner`
- Direct host: `ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech`
- Pooled host: `ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech` (recorded 2026-10-18 19:36 UTC)
- Tools: Node v26.11.0, psql (PostgreSQL) 17.11 (Homebrew)

| Check | State | Note |
| --- | --- | --- |
| No real students (owner, 2026-10-18 19:09 UTC) | passed | - |
| Project created in the DrillMap organization | passed | - |
| No Neon Auth, Vercel integration, or sample data | passed | - |

## Local scripts refuse the exact production hosts

The wizard ran each command locally on 2026-10-18 19:36 UTC with invented credentials and the connection-stop fixture. Nothing contacted Neon.

| Check | Direct | Pooled |
| --- | --- | --- |
| Absent from `scripts/copyDatabaseHosts.json` | passed | passed |
| `migrate-postgres` exits 1 with a host refusal | passed | passed |
| `make-admin admin@example.test` exits 1 with a host refusal | passed | passed |
| `reset-dev-data --yes` exits 1 with a host refusal | passed | passed |
| `create-test-user` exits 1 with a host refusal | passed | passed |
| `check-neon` exits 1 with a host refusal | passed | passed |

```text
migrate-postgres (DIRECT, exit 1): Refusing database host ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech: not an allowed host
make-admin (DIRECT, exit 1): Refusing database host ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech: not an allowed host
reset-dev-data (DIRECT, exit 1): Refusing database host ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech: not an allowed host
create-test-user (DIRECT, exit 1): Refusing database host ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech: not an allowed host
check-neon (DIRECT, exit 1): Refusing database host ep-gentle-band-b5curwyd.c-7.us-east-2.aws.neon.tech: not an allowed host
migrate-postgres (POOLED, exit 1): Refusing database host ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech: not an allowed host
make-admin (POOLED, exit 1): Refusing database host ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech: not an allowed host
reset-dev-data (POOLED, exit 1): Refusing database host ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech: not an allowed host
create-test-user (POOLED, exit 1): Refusing database host ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech: not an allowed host
check-neon (POOLED, exit 1): Refusing database host ep-gentle-band-b5curwyd-pooler.c-7.us-east-2.aws.neon.tech: not an allowed host
```

## Database setup (owner, browser SQL Editor)

| Check | State | Note |
| --- | --- | --- |
| Database empty before setup | passed | - |
| Setup SQL ran as one execution | passed | - |
| Migration records match the candidate (3 rows) | passed | - |
| Table structure matches the copy (80 constraints) | passed | - |
| `sql/app-role.sql` ran | passed | - |
| App login permission check as owner | passed | - |

## App login

| Check | State | Note |
| --- | --- | --- |
| Final password set by the app role (psql, direct host, verify-full) | passed | Starter password, then `\prompt` and `ALTER ROLE ... :'pw'`. See the method note below. |
| Final password works (32 characters) | passed | Owner counted the length locally. |
| Passphrase only in the password manager, distinct from the copy | passed | - |
| Pooled login with certificate checks | passed | - |
| App login permission check as the app | passed | - |
| App can read app tables (0 Accounts) | passed | - |
| Migration journal refused | passed | - |

Method note. The runbook method failed on Neon. Neon's Reset password refuses a role
with no password, and Neon documents that it does not support hashed passwords, so psql's `\password` does not apply.
With owner approval, the owner set a throwaway starter password in the SQL Editor. The
owner then logged in as `drillmap_app` and set the final value through `\prompt` and
`ALTER ROLE drillmap_app PASSWORD :'pw'`. The first pooled login failed once and passed
on retry. The owner deleted the starter statement from the SQL Editor history on
2026-10-18. The runbook now documents this method.

Incidents, no secret recorded. (1) One candidate final password appeared in the agent
chat before use. It was never set and was replaced. (2) The owner reset `neondb_owner`
twice by mistake. Nothing stores that password, and owner access stays in the browser.

```text
SSL connection 
user=drillmap_app
result=PASS
accounts=0
psql:/var/folders/t1/qw3wyt712356jgflr1cjj_jm0000gn/T/drillmap-issue-143-app-checks.sql:25: ERROR:  permission denied for schema drillmap_migrations
```

## Real project settings (owner, Vercel)

| Check | State | Note |
| --- | --- | --- |
| DATABASE_URL saved for Production only, Sensitive | passed | - |
| No redeploy or promotion | passed | - |
| Required setting names present | passed | - |
| Preview and Development hold no credentials | passed | - |
| SCREENSHOT_EXTRACTOR absent (no fake extraction) | passed | - |
| Automatic domain assignment off | passed | - |
| Real domain still serves Atlas build 86ee8c3 | passed | - |

Production setting names: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_SECRET, AUTH_GOOGLE_ID, ANTHROPIC_API_KEY, MONGODB_URI

## Google sign-in client (owner)

| Check | State | Note |
| --- | --- | --- |
| Real origin only | passed | - |
| Real callback only | passed | - |
| Real, copy, and localhost clients are separate | passed | - |
| Home, privacy, and terms links | passed | First seen empty. The owner added the three links in Branding on 2026-10-18. |
| No logo | passed | Owner correction: no logo is set; the first answer was a mistake. |
| Only openid, email, profile scopes | passed | First seen empty. The owner added only these three non-sensitive scopes on 2026-10-18. |
| In production | blocker | Publishing status is Testing |

## Anthropic interim controls (owner)

| Check | State | Note |
| --- | --- | --- |
| $20 monthly ceiling | passed | - |
| Spend emails at $5 and $8 | passed | - |
| No auto-reload, no added credit | passed | - |

No release, cutover, or launch is approved by this file.
