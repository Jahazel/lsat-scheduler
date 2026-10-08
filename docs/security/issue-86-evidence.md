# Stage 1 separation and real-site evidence

For [issue 86](https://github.com/Jahazel/lsat-scheduler/issues/86), under [issue 80](https://github.com/Jahazel/lsat-scheduler/issues/80). Checks completed October 8, 2026, America/Chicago, with local app code at `0ca7d24`.

Stage 1 validation is complete under the owner-approved evidence exception below. The pause on normal local data writes ended on 2026-10-08 after local validation passed. Local work uses only the database on this computer. This does not approve launch or promotion. The launch checklist's full environment-separation check and credential replacement drill remain Not tested.

## Credential evidence and owner-approved exception

The [issue 85 evidence](issue-85-evidence.md) and its [dated issue comment](https://github.com/Jahazel/lsat-scheduler/issues/85#issuecomment-6069882993) record all four replacements on 2026-10-08. The owner reconfirmed the provider actions below during issue 86.

| Credential | Replacement date | Evidence about the old value |
| --- | --- | --- |
| Atlas database password | 2026-10-08 | Owner confirmed the password change. Direct refusal test not run. |
| Anthropic key | 2026-10-08 | Owner confirmed deletion of the old key. Direct refusal test not run. |
| Google client secret | 2026-10-08 | Issue 85 records disabling and deletion. Owner reconfirmed deletion. Direct refusal test not run. |
| Auth.js sign-in secret | 2026-10-08, then a second replacement on the same date | Owner kept a browser signed in before the second replacement. After updating AUTH_SECRET and redeploying, reloading Study settings redirected to sign-in. Fresh Admin Google sign-in and saved Study settings then worked in a separate private window. |

None of the three old provider values remains. No session from before the first secret replacement remains. On 2026-10-08, after the real-site checks, the owner explicitly approved using the confirmed provider changes and deletions instead of the three unavailable direct refusal tests for issue 86. The approval question named that exception and stated that the full launch checklist would not change.

This exception applies only to Stage 1 evidence. Provider actions are not direct refusal test results. The second session test proves refusal of its preserved session on Study settings; it does not establish what happened to the original session or test every protected route. The second secret stays in place. No credential value was viewed, printed, or stored by the agent.

## Separation checks

All results below date from 2026-10-08.

| Check | Result and source |
| --- | --- |
| Local settings contain only local values | Passed, owner confirmed. MONGODB_URI names the documented loopback destination without a database username or password. AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET are the separate local setup values. ANTHROPIC_API_KEY is absent. The agent did not read the file contents. |
| Local settings file is regular; downloaded Vercel settings are absent | Passed, agent checked. `.env.local` is a regular file, not a symbolic link. `.env.vercel.local` is absent. |
| Local MongoDB accepts connections only from this computer | Passed, agent checked the running listener at `127.0.0.1:27017`. |
| Local database access cannot authorize on the real database | Passed for the configured access without credentials. The owner confirmed that no local database username or password exists in the connection string. Atlas refused a read-only listCollections request with no credentials. This is not a password refusal test. |
| Project-folder search finds only allowed hostname references | Passed, agent searched the owner-supplied hostname with hidden, ignored, and binary files included. No files matched before this note recorded the hostname. |
| Data-changing scripts refuse the real host before connecting | Passed, agent ran all five command entry points with the real hostname and invented credentials after the evidence exception was approved. Each exited with code 1 and the expected host refusal. |

Hostname search: `rg --files-with-matches --hidden --no-ignore --text --fixed-strings -- 'cluster0.ofoztlc.mongodb.net' .`. It exited with code 1, meaning no match, with no errors. Output could contain only file paths. This note is now an allowed documentation reference. The search does not decode Git history or inspect files outside the repository folder; it does not replace a secret scan.

The first unauthenticated database checker expected MongoDB code 13 and hid other errors. The owner reported `CHECK: test could not finish`. The agent reproduced the request without credentials. Atlas returned code 8000 with a message beginning `(Unauthorized) not authorized`. The corrected checker recognizes code 13, or code 8000 together with that explicit refusal message. Code 8000 alone is not a pass. The corrected request returned `PASS: unauthenticated access refused` and exited with code 0. It changed no data and printed no collection names or connection string.

The command refusal checks used `reset-dev-data.mjs --yes`, `make-admin.mjs` with an invented email, and the analytics-snapshot, weekly-schedule, and activity-check-in migrations. Each subprocess had only the test database setting and NODE_ENV=test. The existing stop-database-connection fixture would stop any attempted connection. No command reached it. No real credential was used. Earlier, `npm test -- scripts/localDatabaseGuard.test.mjs scripts/localDatabaseScripts.test.mjs` passed all 95 tests with invented destinations.

## Real-site checks

The owner confirmed all results on 2026-10-08 using a temporary test student Account and a separate Admin private window.

| Check | Result |
| --- | --- |
| Password signup and onboarding | Passed. The owner used a Gmail address in the password form, completed the initial study-settings form, and reached a Weekly schedule. The initial page title was not observed; the described form matches onboarding. |
| One real screenshot creates an Analytics snapshot and Weekly schedule | Passed. The owner uploaded a real 7Sage screenshot, reviewed and approved its extracted values, and saw the resulting schedule. Issue 85 records an earlier separate successful extraction. |
| Activity check-in persists | Passed. A Schedule activity marked Done or Completed still showed as completed after a reload. |
| Student Google sign-in opens the same Account | Passed. After signing out, the owner used Continue with Google with the same Gmail address. The same Weekly schedule and completed activity appeared. |
| Admin Google sign-in and student schedule view | Passed. Fresh Admin Google sign-in worked. All students opened the test student's Weekly schedule. |
| Test student Account deletion | Passed. Deletion returned the browser to sign-in. The test student disappeared after the Admin reloaded All students. This is a functional check, not a database audit or proof of transactional deletion or backup behavior. |
| Anthropic spend controls | Passed. Owner reconfirmed the $20 monthly limit, alerts at $5 and $8, auto-reload off, and balance under $10. No controls changed. |

## Local end-to-end checks

These ran only after the preceding checks and the owner's evidence exception approval. The local app explicitly used the loopback database, an empty Anthropic key, and the localhost sign-in URL. Inherited Auth.js and Google credentials were removed from the app process; local values loaded from the owner-confirmed local settings file. The agent did not inspect those values.

| Check | Result on 2026-10-08 |
| --- | --- |
| Local password signup | Passed, owner reported. The invented Account `stage1-local@example.test` opened onboarding. |
| Real make-admin command on the local database | Passed, agent ran it once. The command exited with code 0 and reported promotion on `127.0.0.1:27017`. The owner signed out and back in, completed onboarding without a screenshot, and saw Test controls. |
| Sample analytics snapshot creates a Weekly schedule | Passed, owner reported. Steady Sample analytics were generated, reviewed, and approved. This week showed a Weekly schedule with Schedule activities. No paid call ran. |
| Reset script with --yes | Passed, agent ran the documented package command with an explicit loopback database setting. It exited with code 0. A separate count check confirmed that all study records were gone and the local Admin Account remained. |

| Local collection | Before reset | After reset |
| --- | --- | --- |
| Student profiles | 1 | 0 |
| Analytics snapshots | 1 | 0 |
| Weekly schedules | 1 | 0 |
| Activity check-ins | 37 | 0 |
| Matching local Admin Account | 1 | 1 |

The agent checked counts only and printed no student records or password hashes. The reset touched only the local database. The local Account remains for later local work; it now needs onboarding again.

## Completion record

The launch checklist's Until launch section records the replacement dates, evidence exception, completed local validation, and the end of the pause on 2026-10-08. The full environment-separation and credential replacement drill checks remain Not tested. Their requirements still include the separate copy of the site and the broader drill. No launch checklist check was weakened or marked passed. The no-promotion rule remains in force.

Issue 86 is closed. Its [dated completion comment](https://github.com/Jahazel/lsat-scheduler/issues/86#issuecomment-6070837688) also preserves the results and exception on GitHub.
