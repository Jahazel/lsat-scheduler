# Local test Account validation

> Historical evidence from the old MongoDB version. Issue #104 moved this
> command to Postgres. Use the [README](../README.md) for current setup and commands.

Validated on October 11, 2026 for [issue 116](https://github.com/Jahazel/lsat-scheduler/issues/116).
All database writes used `mongodb://127.0.0.1:27017/lsat-scheduler`.

## Command and browser checks

| Check | Result |
| --- | --- |
| Default command | `npm run create-test-user` printed `student@test.local`, password `DrillMapTest123`, and role `student`. |
| Student sign-in | Entered the printed credentials on `/login` in the T3 Code browser. Reached `/onboarding` and saw "Tell us about your prep". |
| Admin command | `npm run create-test-user -- --admin` printed `admin@test.local`, the same test password, and role `admin`. |
| Admin sign-in | Signed out, opened `/login`, and entered the printed Admin credentials. Reached `/admin` and saw "All students". |
| Custom email and Admin together | The real command trimmed and lowercased a unique custom email, printed its credentials, and saved role `admin`. |
| Account only | Collection names and all non-Account collection counts stayed unchanged after creation of the custom Account. |
| Password and role reset | Two runs changed an existing custom Admin to a student. The fixed password worked; the old password failed. A later `--admin` run promoted the same Account. |
| Record preservation | The Account count stayed at one. Its ID, name, and simulated date stayed unchanged. Full comparisons of its Study settings and Weekly schedule records passed. |

The preservation check inserted temporary local records for a unique custom
Account. It removed those records after the check. The two default test
Accounts remain for later local verification. Neither has Study settings or a
Weekly schedule. No Google sign-in or paid analytics request ran.

## Automated checks

The script test file covers argument parsing, both default roles, custom
emails, bcrypt password hashes, repeat resets, and unsuccessful writes.
Subprocess tests run the real command with the existing connection-stop test
fixture. Remote hosts, mixed local and remote hosts, proxy hosts, missing
configuration, MongoDB SRV addresses, production, and Postgres targets fail
before any database connection. Local MongoDB addresses reach that boundary.

Focused tests, lint, and typechecking passed. The commit hook also runs the
full test suite and scans staged changes for secrets.

The code-review skill ran separate Standards and Spec reviews from the branch's
starting commit, `e4eb4e5`. The Standards review found a missing launch-checklist
update. The environment-separation check now includes the command's non-local
host and production refusals. The reviewer checked the correction. Both reviews
finished with no remaining findings.

## Saved browser proof

The browser artifacts are local files outside the repository:

- Student onboarding screenshot: `/Users/jahazelsanchez/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mv4end9r-23071891.png`
- Admin screenshot: `/Users/jahazelsanchez/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mv4eoepd-4ca59a08.png`
- Sign-in recording: `/Users/jahazelsanchez/.t3/userdata/attachments/799621db-951e-446a-b051-c9c7ce58b3f2-a162644a-d108-4635-a7c5-9110551cc313-mp4.mp4`

The first sign-out wait expected `/login`, but sign-out returned to `/`.
Opening `/login` explicitly completed the Admin check. This was a check
correction; no app code changed.
