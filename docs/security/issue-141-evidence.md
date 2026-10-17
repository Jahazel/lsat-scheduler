# Issue 141 evidence: the hosted copy with separate access

Part of [issue 137](https://github.com/Jahazel/lsat-scheduler/issues/137) (Stage 3). Recorded by the owner with `scripts/issue-141-wizard.sh`, 2026-10-17 13:35 UTC to 2026-10-17 15:35 UTC.
This file holds no password, secret, connection string, or personal email.

Reviewed against the owner's setup conversation on 2026-10-17. Provider settings and most successful steps are owner-reported. Screenshots directly show the initial errors and selected settings. Finishing the guide does not finish issue 141. The hosted student walkthrough and second Admin remain untested.

## Version

- Candidate commit recorded at guide start: `9b9a8bb6cc2cbcdfb43f7457794ebf642a0147f8`. The final deployment's exact commit still needs confirmation after the redeploys.
- Copy Vercel project: `drillmap-copy`, domain `drillmap-copy.vercel.app`
- Initial deployment recorded by the guide: `https://drillmap-copy-1frvg2s99-jahazels-projects.vercel.app/`. The owner redeployed after correcting settings. This URL is not verified as the final working deployment. Record that deployment ID before exact-version checks can pass.
- Neon copy project `drillmap-copy`, database `neondb`, pooled host `ep-restless-tooth-b42czg5d-pooler.c-6.us-east-2.aws.neon.tech`
- Owner SQL SHA-256: `8d30aed734bb09faa734f5f1a13ff8bfc6fd253eaa2e765b7e1905a09c2bc6f9` (3 journal entries)
- Tools: Node v26.11.0, psql (PostgreSQL) 17.11 (Homebrew). Installed Chrome version read from the Mac application metadata: 155.0.8059.82. The active browser process version was not independently checked.

## Database and access

| Check | State | Note |
| --- | --- | --- |
| Owner SQL and app role applied in the SQL editor | passed | - |
| App password random, 32+ characters, in password manager (reset on 2026-10-17) | blocker | Using Neon's generated 16-character password temporarily. Longer password deferred by owner. |
| db:check-copy through the pooled endpoint as drillmap_app (channel binding: required) | passed | - |

Check output:

```text
PASS: Encrypted connection with certificate and host-name checks
PASS: App reads and writes
PASS: Limited role and immutable Weekly schedules
PASS: Owner-only migration journal refused
PASS: Database rules
PASS: Account deletion
PASS: Throwaway records rolled back
```

The owner reset the earlier screenshot-exposed app password through Neon's console. The replacement has 16 characters and is saved in Apple Passwords. PostgreSQL's hidden `\password` command failed with a Neon HTTP 400 response stating that Neon only supports receiving plaintext passwords. The longer password was not applied. The owner chose to retain the generated password temporarily. No end date or exception to the real-site release rules was granted. A task-local alternative helper was prepared and tested locally, but its independent review was stopped at the owner's request and it was never used on Neon. It is not approved operational evidence.

## Copy project settings

| Check | State | Note |
| --- | --- | --- |
| Automatic domain assignment off on the copy | passed | - |
| Five Production-only settings; fake extraction; no Anthropic or email key | passed | - |
| Copy AUTH_SECRET differs from the computer's (hash compare) | not verified for final value | Automatic clipboard transfer failed. The owner generated a replacement with OpenSSL and saved it in Vercel. The guide compared its earlier generated value, so that comparison does not prove the final setting. |
| Real AUTH_SECRET differs from the computer's and the copy's (hash compare) | not compared | Vercel did not show the real value. The computer's secret was replaced on 2026-10-08 (issue 84). |
| Computer, copy, and real Google client IDs all differ | passed | - |
| Copy deployment promoted by hand and live | passed | - |

Setup corrections: the original Vercel entry was named `DATABASE_URI`. The owner replaced it with `DATABASE_URL` and redeployed. The supplied connection uses the copy's pooled endpoint and `sslmode=verify-full`. Initial logs showed `MissingSecret`, then `DATABASE_URL is not set`. Later Google sign-in succeeded on `https://drillmap-copy.vercel.app`. A longer Vercel deployment URL produced Google's `redirect_uri_mismatch`. Use the copy's registered domain for Google sign-in. Final success is owner-reported; no full browser recording was captured by the agent.

## Admin Accounts

| Check | Admin 1 | Admin 2 |
| --- | --- | --- |
| Google redirect returns to the copy | passed | blocker |
| Owner grant, one row, no password | passed | blocker |
| Fresh Google sign-in opens Admin pages | passed | blocker |
| Password sign-in refused | passed | blocker |

Admin 2 REDIRECT: Second Admin not added. Deferred by owner.

Admin 2 GRANT: Second Admin not added. No role grant performed.

Admin 2 FRESH: Second Admin not added. No role grant performed.

Admin 2 PASSWORD_REFUSED: Second Admin not added. No role grant performed.

The guide's Account query referenced a nonexistent `created_at` column. The corrected read omitted that column and its sort. The owner found their Google-linked student Account with no password, applied the owner-only grant to that verified Account ID, then confirmed role `admin` and no password. The owner reported fresh Admin access; the guide records password refusal as passed. No second Admin was created or granted access.

## Browser walkthrough

| Step | State | Note |
| --- | --- | --- |
| Signup and onboarding | blocker | Not tested. Deferred by owner. |
| Fake extraction and approval | blocker | Not tested. Deferred by owner. |
| This week | blocker | Not tested. Deferred by owner. |
| Activity check-in save and correction | blocker | Not tested. Deferred by owner. |
| Progress | blocker | Not tested. Deferred by owner. |
| Admin read-only student view | blocker | Not tested. Deferred by owner. |
| Admin view wrote nothing (row fingerprint unchanged) | not tested | The Admin student view was skipped. Matching fingerprints without the viewing action do not prove that viewing writes nothing. |
| Admin test controls | blocker | Not tested. Deferred by owner. |
| Account deletion | blocker | Not tested. Deferred by owner. |
| Deleted records gone (counts) | blocker | Not tested. Deferred by owner. |

Record counts (accounts/students/snapshots/schedules/check_ins): before `1/0/0/0/0`, after student steps `1/0/0/0/0`, after deletion `1/0/0/0/0`.

These counts show one Account and no student or study records. No student setup or deletion occurred. They do not prove the student flow, Admin student access, or deletion.

## Separation and the real site

| Check | State | Note |
| --- | --- | --- |
| Real project Preview and Development hold no credentials | passed | - |
| Real project automatic domain assignment off | passed | - |
| Real domain still serves old build 86ee8c3 | passed | - |
| Copy Preview and Development hold no values | passed | - |

The copy uses its own Neon project and SQL-created `drillmap_app` login. The computer uses a loopback database.
No launch checklist row passes from this file alone. No release or launch is approved.

## Remaining work

- Set and verify a random app password of at least 32 characters with a supported method that keeps secrets out of history, files, arguments, environment variables, and logs. Repeat affected connection and role checks afterward.
- Create and verify the second intended Admin through Google and an owner-only grant. Check fresh Admin access, no stored password, and password refusal.
- Perform the hosted student walkthrough and Admin student-view and test-control checks. Record each action and its resulting saved state. Repeat the fingerprint check around the actual viewing action and prove Account deletion.
- Recheck the final copy secret against the computer's value. Resolve the unavailable real-secret comparison without exposing or changing the real site's secret during this task.
- Record the final working deployment ID, exact commit, and active browser version. Tie the hosted evidence to that deployment.
- Keep issue 141 open. The owner deferred these checks; finishing the guide did not pass them or authorize a real-site release.
