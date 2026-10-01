# Human evidence checklist for issue 71

Date: October 1, 2026. Read alongside [the provider evidence](issue-71-evidence.md). These steps collect facts only. Do not save changed settings, rotate keys, buy upgrades, publish OAuth configuration, or run a production restore for this ticket.

Use `yes`, `no`, `none`, or `unknown` when appropriate. Keep credentials, MFA codes, recovery codes, backup contents, personal contact details, and complete connection strings out of chat, GitHub, and these files. Redacted evidence needs only the setting label, state, provider/project, and date.

## Facts to supply first

- [ ] Confirm whether `.env.vercel.local` is a current copy of DrillMap Production settings. Record its source and pull date if known. If it is outdated, say so. The local comparisons show shared keys and database credentials but cannot establish live values.
- [ ] State whether backups exist outside Atlas. Atlas reports Backups Inactive. If another process exists, give its schedule, last successful date, storage category, encryption status, access owner, and expiration policy. Do not send a dump or storage credential.
- [ ] State whether a restore has ever succeeded. Supply the date, isolated destination, result, approximate time to recover, and backup age. If none exists, record `no restore test`. Do not initiate one now.
- [ ] Name the incident owner and the person who can act if that owner is unavailable. State which provider accounts that person can already access. An app Admin role does not grant cloud-dashboard access. If nobody has that access, record `no backup operator`.

## Privileged login and recovery

1. The Vercel and GitHub account dashboards already show MFA inactive. No additional proof of those settings is needed. Their remediation belongs to a later ticket.
2. The Google owner account already shows 2-Step Verification enabled. Confirm privately that you can recover it without the primary phone/device. Report only whether recovery material or another permitted factor is available, never its contents.
3. MongoDB account security shows a linked Google identity and disabled native MFA setup controls. Organization Settings confirms Require MFA is off and exempts federated login from its prompt. Confirm whether Google is the only permitted login/recovery path. If unavailable, record `unknown`.
4. For Anthropic, establish which login methods the Console admin account permits and which second-factor protection applies. The inspected Console settings did not establish this. If you cannot verify it, record `unknown`.
5. Confirm whether any additional people, service accounts, pending invitations, installed apps, or tokens hold deployment/database/OAuth/Anthropic administration rights beyond the observed owner. Supply roles and counts, without token values or private email addresses.

## Production associations and alerts

1. Confirm that the inspected Atlas project/Cluster0, Google DrillMap Web client, and Anthropic Individual Org/Default workspace are the ones used by Production. Use names or an internal record you already trust. Do not reveal a secret to prove the association.
2. Identify any external uptime/security monitoring, backup jobs, or cost notifications not visible in the dashboards. State the condition, recipient role, and last known successful delivery. A checked provider alert is configuration evidence; receipt or a past alert supplies delivery evidence.
3. State the acceptable amount of lost study data and time to recover after a failure. These are business decisions, not settings this inspection can infer.
4. Confirm the published backup/retention statement against the actual backup process. The app currently promises encrypted backups with up to 30-day retention, while Atlas backups are inactive. Record the mismatch for issue 72 rather than editing legal text here.

## Emergency procedure evidence

For each row, record an authorized operator and whether an existing written procedure or past rehearsal is available. Inspect pages only; do not execute these actions.

| Situation | Procedure that needs evidence | Current limit |
| --- | --- | --- |
| Stop public traffic | Vercel Project > Settings > General > Pause Project; account for previews and shareable links separately. | The button exists, but no shutdown was tested. |
| Stop paid screenshot requests | Identify the Anthropic key actually used by Production and its provider revocation control. | No app feature switch exists. Removing a Vercel variable alone does not invalidate copied keys. |
| Database credential incident | Identify the app database user and a provider credential-revocation/network-containment procedure. | The copied app user has `atlasAdmin`; do not change it during evidence gathering. |
| OAuth secret incident | Identify the Google Web client's rotation controls and the deployments that need a replacement. | Current secret is Enabled. No rotation was attempted. |
| Deployment account compromise | Identify GitHub/Vercel app, token, session, and deployment access that needs revocation. | Existing inventory is incomplete; do not create recovery credentials here. |
| Compromised app session/admin | Identify how active app sessions would be invalidated and privileged reads stopped. | Issue 70 shows that demotion/deletion alone does not revoke existing JWT claims. |
| Data loss | Identify the recovery source, authorized operator, isolated test destination, and deletion/retention handling. | No verified recoverable backup or restore rehearsal yet. |

## Record of human evidence

The user supplied `Atlas ready` and completed the sign-in needed for read-only inspection. Asked together about backups, restores, production-copy provenance, and an alternate incident operator, the user answered "None I think??". The answer expresses uncertainty. It does not establish every item's absence or confirm that the local production copy is current. Update the remaining items when more evidence becomes available.

| Fact | Answer | Evidence date |
| --- | --- | --- |
| Current production-copy provenance | Unknown; no specific confirmation | October 1, 2026 |
| External backup process | Unknown; user thinks none exists | October 1, 2026 |
| Successful restore history | Unknown; user thinks none exists | October 1, 2026 |
| Alternate incident operator | Unverified; no named operator supplied | October 1, 2026 |
| Recovery-material availability | Pending | Pending |
| Atlas permitted login paths/policy | Google link observed; organization Require MFA off; alternate login/recovery paths unverified | October 1, 2026 |
| Anthropic admin MFA/login paths | Pending | Pending |
| Additional privileged access/monitoring | Pending | Pending |
| Acceptable data loss/recovery time | Pending | Pending |

Issue 71 can supply an honest record of unverified items to the later decisions. A pending or unknown item must not become a claim that its protection is absent or that launch is approved.

The user authorized closing issue 71 on October 1, 2026. The [closure summary](https://github.com/Jahazel/lsat-scheduler/issues/71#issuecomment-5940024276) records the unresolved evidence for issues 72 and 73. Checklist items remain unresolved where marked pending, unknown, or unverified; closing the evidence task does not mark them as satisfied.
