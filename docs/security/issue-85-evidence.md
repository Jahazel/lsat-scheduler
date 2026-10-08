# Real-site credential replacement evidence

For [issue 85](https://github.com/Jahazel/lsat-scheduler/issues/85), under [issue 80](https://github.com/Jahazel/lsat-scheduler/issues/80). Recorded on October 8, 2026, America/Chicago.

## Real-site checks

The owner confirmed these results on October 8, 2026. The Production redeploy reached Ready. These are owner-reported checks after the old Anthropic key and Google secret were removed.

| Check | Result | Date |
| --- | --- | --- |
| Google sign-in | Passed | 2026-10-08 |
| Study settings loads previously saved values | Passed | 2026-10-08 |
| One real screenshot extraction returns the expected analytics | Passed | 2026-10-08 |
| A sign-in session from before the replacement no longer grants access | Not tested. The owner had already signed in again and had no other browser or device with an earlier session. | 2026-10-08 |

No session from before this first replacement remained for testing. In [issue 86](https://github.com/Jahazel/lsat-scheduler/issues/86), the owner replaced AUTH_SECRET a second time on 2026-10-08 while preserving a signed-in browser. That session was refused. See [final validation evidence](issue-86-evidence.md).

## Replacement records

| Credential | Replacement date | Old credential status |
| --- | --- | --- |
| Atlas database password | 2026-10-08 | Set a new random 32-character password in Atlas and updated MONGODB_URI in Vercel Production. Replacement invalidates the old password. Direct refusal testing could not run because the old value was unavailable. Issue 86 records the owner-approved evidence exception. |
| Anthropic key | 2026-10-08 | Updated ANTHROPIC_API_KEY in Vercel Production. Deleted the old key after the new deployment worked. |
| Auth.js secret | 2026-10-08 | Set a new independent random AUTH_SECRET in Vercel Production. Old-session refusal not tested. |
| Google client secret | 2026-10-08 | Updated AUTH_GOOGLE_SECRET in Vercel Production. Disabled and deleted the old secret after the new deployment worked. |

The owner confirmed that all four Vercel settings are Secret or Sensitive and apply only to Production. No Preview, Development, branch-specific, or inherited shared copies remain for this project. AUTH_GOOGLE_ID was set from the intended real-site Google client. This does not establish that the previous ID differed.

The Anthropic spend controls remain unchanged: a $20 monthly limit, alerts at $5 and $8, auto-reload off, and a balance under $10.

The owner confirmed the replacement and removal results for issue 85 on October 8, 2026. The [dated issue comment](https://github.com/Jahazel/lsat-scheduler/issues/85#issuecomment-6069882993) records those results. Issue 85 is closed. The launch checklist records that date. At issue 85 completion, the pause on local writes stayed in force until issue 86 passed. It later ended on 2026-10-08 after issue 86 validation, under the owner-approved evidence exception. The no-promotion rule remains in force. Launch checks H4 and H5 remain Not tested.
