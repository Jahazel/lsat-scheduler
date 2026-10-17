# Issue 139 evidence: provider two-step sign-in and recovery access

Date: 2026-10-16. Recorded by the owner through a guided checklist. This file holds methods, states, and dates only. It holds no recovery code, secret, or Admin credential.

No launch checklist row becomes passed from this ticket. Text-message codes are not allowed.

## Provider login methods

These are owner-reported results. After the wizard, the owner confirmed completion of all required checks except Anthropic. The entries below retain the protection types entered during the wizard; they do not enumerate individual login paths.

| Provider | State | Login methods checked | Protection | Date | Blocker |
| --- | --- | --- | --- | --- | --- |
| Vercel | passed | authenticator and passkey | both | 2026-10-16 | - |
| GitHub | passed | Authenticator and Passkey | both | 2026-10-16 | - |
| Neon | passed | passkey and authenticator | both | 2026-10-16 | - |
| MongoDB Atlas (until deletion) | passed | authenticator and security key | both | 2026-10-16 | - |
| Google Cloud owner | passed | Authenticator passkey | both | 2026-10-16 | - |
| Anthropic Console | deferred; unresolved | not yet verified | unverified | 2026-10-16 | Could not find authenticator or passkey settings in Console. |

Deferred providers (not passed): none

## Recovery codes

The owner confirmed password-manager storage and a printed copy for all providers except Anthropic after the wizard. The password manager name was not recorded. No codes were collected.

| Provider | Password manager and printed copy | Date |
| --- | --- | --- |
| VERCEL | done | 2026-10-16 |
| GITHUB | done | 2026-10-16 |
| NEON | done; owner confirmed Neon provided recovery codes | 2026-10-16 |
| ATLAS | done | 2026-10-16 |
| GCLOUD | done | 2026-10-16 |
| ANTHROPIC | deferred; unresolved: Could not find two-step sign-in settings or recovery codes in Anthropic Console. | 2026-10-16 |

## Admin Google two-step sign-in

| Admin | State | Method | Date | Blocker |
| --- | --- | --- | --- | --- |
| Admin 1 | passed | passkey or authenticator; exact method not recorded | 2026-10-16 | Owner confirmed completion after the wizard. |
| Admin 2 | passed | both | 2026-10-16 |  |

## Documentation limits

The documentation checked during wizard preparation stated that Neon did not offer recovery codes: https://neon.com/docs/manage/accounts. The owner reported that Neon did provide recovery codes and confirmed completion. This account observation replaces the earlier documentation-based blocker.
Provider documentation guides the procedure. The owner observations above determine the recorded results.

Overall result: the owner confirmed completion of the non-Anthropic checks. Anthropic sign-in protection and recovery remain unresolved and moved to follow-up [issue 151](https://github.com/Jahazel/lsat-scheduler/issues/151). Issue 139 closes with that remaining work transferred, not passed. No launch approval is implied.

## Owner-approved order

The owner chose to work on Anthropic another day. Follow-up #151 no longer blocks preparation in #141 or #143. It blocks the real-site move in #146. This changes the earlier prerequisite order only; it does not pass Anthropic, authorize paid extraction, or approve release or launch.
