# Stage 2 automatic production deploys evidence

For [issue 93](https://github.com/Jahazel/lsat-scheduler/issues/93), under [issue 92](https://github.com/Jahazel/lsat-scheduler/issues/92). Recorded on October 8, 2026, America/Chicago.

## What changed

The owner turned off **Auto-assign Custom Production Domains** for the real Vercel project on 2026-10-08. The setting is under Settings, Environments, Production, Branch Tracking. A merge to the main branch still builds. The new build gets no traffic until the owner promotes it by hand. The real site keeps serving the old MongoDB build until Stage 3.

## Owner checks

The owner confirmed these results on 2026-10-08. The [dated issue comment](https://github.com/Jahazel/lsat-scheduler/issues/93#issuecomment-6071746730) records them.

| Check | Result | Date |
| --- | --- | --- |
| The switch stays off after a page reload | Passed | 2026-10-08 |
| The Current build is unchanged: `86ee8c3` before and after | Passed | 2026-10-08 |
| The real site loads | Passed | 2026-10-08 |
| Both Admin Accounts sign in and open All students | Passed | 2026-10-08 |
| The first merge to the main branch after the change shows as Staged, not Current | Pending. The merge of the pull request that adds this note is the test. | |

The result of the pending check goes in the close comment on issue 93. The final Stage 2 evidence note collects it.

The no-promotion rule remains in force. This note changes no launch checklist row.
