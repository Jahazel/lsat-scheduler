# Issue 141 follow-up evidence

Continues [issue-141-evidence.md](issue-141-evidence.md). Recorded with `scripts/issue-141-wizard.sh`, 2026-10-17 17:39 UTC to 2026-10-17 17:57 UTC.
This file holds no password, secret, connection string, or personal email.

## Final version

- GitHub main at start: `9b9a8bb6cc2cbcdfb43f7457794ebf642a0147f8`
- Promoted deployment: `dpl_HsPiK1K1x`, commit `9b9a8bb6cc2cbcdfb43f7457794ebf642a0147f8` (matches main: yes)
- Tools: Node v26.11.0, psql (PostgreSQL) 17.11 (Homebrew), browser 154.0.8037.98

## Database password and secret

| Check | State | Note |
| --- | --- | --- |
| psql ALTER ROLE accepted | not run | - |
| App password is 32+ characters ( characters), in password manager | blocker | Owner declined the clipboard method. A supported method is still needed. |
| db:check-copy through the pooled endpoint with the new password | not run | - |

```text

```

| Check | State | Note |
| --- | --- | --- |
| Copy AUTH_SECRET set from a known value that differs from the computer's | passed | - |
| Real AUTH_SECRET compared | not compared | Sensitive value cannot be shown. Owner decision needed: accept not comparing, or rotate the real secret in a separate approved task. |
| Final deployment live | passed | - |

## Second Admin

| Check | State | Note |
| --- | --- | --- |
| Google redirect returns to the copy | passed | - |
| Owner grant, one row, no password | passed | - |
| Fresh Google sign-in opens Admin pages | passed | - |
| Password sign-in refused | passed | - |

## Browser walkthrough

| Step | State | Note |
| --- | --- | --- |
| Signup and onboarding | passed | - |
| Fake extraction and approval | passed | - |
| This week | passed | - |
| Activity check-in save and correction | passed | - |
| Progress | passed | - |
| Admin read-only student view | passed | - |
| Admin view wrote nothing (fingerprints around the view) | passed | - |
| Admin test controls | passed | - |
| Account deletion | passed | - |
| Deleted records gone (counts) | passed | - |

Counts (accounts/students/snapshots/schedules/check_ins): before `2/0/0/0/0`, after student steps `3/1/1/1/1`, after deletion `2/0/0/0/0`.
Resulting student state: The schedule was shown, tuesday prefered and jan 2027 goal test date was saved, and it was still there after reload

## Separation

| Check | State | Note |
| --- | --- | --- |
| Real project Preview and Development hold no credentials | passed | - |
| Real project automatic domain assignment off | passed | - |
| Real domain still serves old build 86ee8c3 | passed | - |
| Copy Preview and Development hold no values | passed | - |
| Copy has only the five Production settings | passed | - |

No launch checklist row passes from this file alone. No release or launch is approved.
