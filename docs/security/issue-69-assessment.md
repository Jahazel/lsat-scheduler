# DrillMap public-signup assessment

Assessment for [Determine DrillMap readiness for public signup](https://github.com/Jahazel/lsat-scheduler/issues/69). Prepared October 6, 2026, America/Chicago, against checkout `1a39e0474bd6cfa682ab2c9edb425488aeddb5a5`.

Status: assessment complete. The owner settled the Neon access and monitoring rules on October 6, 2026. The outcome is not ready. Implementation and release verification follow separately.

**Decision: DrillMap is not ready for unrestricted public signup.** The owner previously chose to keep signup open while withholding promotion. That interim choice does not establish that signup is safe. The app has confirmed security gaps, and the launch checklist has no recorded passing results for a release.

This report combines the assessment evidence and orders the remediation work. It does not implement fixes or approve a release. The [launch checklist](release-gate.md) remains the authority for passing a specific version and for the owner's separate launch approval.

## Scope and evidence

The scope covers password and Google sign-in, student records, admin reads and the admin's own student side, account deletion, public lead capture, browser protections, and paid Anthropic screenshot extraction. Payments remain outside the scope. Adding payments requires another review.

The record relationships come from [GLOSSARY.md](../../GLOSSARY.md). A student owns analytics snapshots and weekly schedules. A weekly schedule owns schedule activities and their activity check-ins. Admins can read real students' weekly schedules without changing them. Admin test changes affect only the admin's own student side.

| Evidence | What it establishes | Limit |
| --- | --- | --- |
| Application evidence (issue #70), October 1 | Source findings and 19 synthetic reproduction cases. The recorded full suite passed 416 tests. | Tests mock database and identity state. They do not prove a production attack or satisfy the later launch checklist. |
| Provider evidence (issue #71), October 1 | Dated dashboard observations, local secret-equality results, and three public HTTP HEAD responses. | Unknown settings remain unknown. A dashboard observation is not an end-to-end test. |
| [Required protections](issue-72-decisions.md) and [launch checklist](release-gate.md) | Owner-approved protection categories, release rules, recovery targets, and acceptance checks. | A policy decision is not implementation evidence. |
| [Account](issue-74-decisions.md), [abuse](issue-75-decisions.md), [browser and data](issue-76-decisions.md), and [infrastructure](issue-77-decisions.md) rules | Detailed owner decisions and their links to launch checks. | Their implementation and deployed behavior still need verification. |
| [Database research and decision](issue-78-database-research.md#decision), October 6 | Move to Postgres on Neon before launch. The owner confirmed that the database holds only two admin accounts, so no student data transfer is planned. | Published provider capabilities do not prove DrillMap's backups or restore time. Neon access choices are settled below; their implementation remains unverified. |
| October 6 checkout comparison | `src`, `next.config.ts`, and `package-lock.json` are unchanged from the application audit's commit `81f32fa`. A GitHub checks workflow and a local commit hook now exist. | No new production inspection, test run, dependency audit, or history-wide secret scan took place for this synthesis. A later concurrent uncommitted workflow update is described below and remains unverified. |

Evidence labels below have separate meanings:

- **Source finding:** code establishes a protection or gap.
- **Synthetic reproduction:** a local test demonstrates behavior with synthetic input and mocked services.
- **Provider observation:** a dated provider setting or response was read.
- **Unverified:** the required evidence is missing. This fails the launch gate until checked.

## Launch blockers

All rows block a readiness claim until their named checks pass, or the owner records a specific permitted risk exception. The priorities below order the work. They do not waive lower-priority checks.

| Protection to complete | Evidence and effect | Required launch checks |
| --- | --- | --- |
| Separate local, test, and real-site access; replace copied real-site credentials | Provider evidence found equal secrets in local environment copies. On October 6 the owner confirmed that local work uses the real database. Local writes can therefore affect real records. Atlas had an app user with admin powers and no managed backups. | Separate credentials and databases; script refusal on the real database; credential replacement and rejection of old keys; limited database powers. H2 to H5. |
| Recheck current account existence and permissions on every protected request | F01/F02 source findings and synthetic reproductions show that retained session claims survive demotion or deletion. Stale admin claims can read student records. Account deletion does not revoke other session copies. | Permission and session revocation, bounded lifetimes, disabled-account refusal, and recent sign-in for sensitive account changes. B1, B10. |
| Bind Google identity safely and verify password-account email ownership | F03 source and synthetic evidence show Google association by email, with no stored stable Google ID or verified-email check. Password signup signs in without proving email ownership. Account takeover remains a suspected impact, not a demonstrated production attack. | Google ID association; verified email; one sign-in method per account; controlled account transition; Google-only admins and provider publishing. B2 to B4, B8, B9, H6. |
| Complete password and recovery protections | F04 reproduces bcrypt truncation after 72 bytes. Common-password rejection, verification, reset, and change flows are absent. | Password byte boundaries and common-password rules; single-use recovery; safe failure responses and session revocation. B5 to B7. |
| Bound public actions and paid extraction | F05/F09 source evidence shows no application limits. The provider's organization limit does not allocate a budget per student. F06 reproduces missing extraction-handler authentication in a direct call; this does not prove a public Proxy bypass. | Atomic shared counters; per-student and site limits; handler authentication; budget counted before calls; no automatic retry; emergency switch; manual analytics entry. C1 to C6, D1. |
| Validate screenshots and model output before use | F07 synthetic tests show a claimed PNG of 6 MiB reaches the mocked provider. Production acceptance of that size is unproven. F08 reproduces acceptance of invalid model fields. F09 reproduces arbitrary labels and fabricated extraction metadata at approval. | Real file type, size, dimensions, and frame checks; model-output schema; known analytics labels; manual-entry provenance; onboarding without a student record. D2 to D4, C6. |
| Preserve student isolation and the admin read boundary during remediation | F10 and existing synthetic tests establish useful ownership filters and field allowlists. These protections need checks across every route and directly callable action after the database and account changes. There is no established foreign-student write in the evidence. | Full student/admin/anonymous access matrix; submitted role/owner/operator fields refused; admin reads create nothing; admin test actions affect only their own student side. A1 to A4. |
| Enforce browser request and private-response protections | F12 source findings and direct-handler tests show missing independent Origin checks on JSON approval and multipart extraction. Browser request forgery remains unproven. F13 shows missing explicit private-response and header policies. Provider evidence reproduces missing headers on the public landing response only. | Origin and content-type refusal; secure cookies; private responses that are not cached; tested security headers; no previous student's data after sign-out and account switching. E1 to E4, A5. |
| Make deletion, onboarding, retention, and disclosures reliable | F11 source evidence shows sequential student deletion without one transaction or durable retry state, and separate onboarding writes. Partial deletion is a suspected impact. Lead deletion and the agreed retention jobs are absent. Current disclosures do not describe the complete screenshot transfer and provider retention. | Failure and concurrency checks; deletion after restore; retention jobs; truthful privacy and AI pages with a working contact address. F1 to F4. |
| Return safe errors and retain a useful security log | F15 reproduces an uncaught malformed multipart error. No structured application security log exists. Production secret or stack-trace disclosure was not established. | Safe errors with matching codes; no sensitive log contents; required event records and 90-day retention. F5, F6. |
| Resolve dependency advisories and complete automatic checks | F16's dated audit found Next.js and sharp runtime advisory matches, plus development dependencies. Application exploitation remains unverified. The committed workflow at `1a39e04` runs lint, typecheck, and tests on main pushes and pull requests. It has no runtime audit or gitleaks step. A concurrent uncommitted workflow update appeared later in this session with an all-push trigger, a runtime audit, and a full-history gitleaks job. That update was not authored or verified as part of this assessment. | Current advisory fixes or documented unreachable paths within deadlines; secret scan including full history; required checks after every push. G1 to G3. |
| Secure provider access and prove recovery and alerts | October 1 provider observations found Vercel/GitHub two-step sign-in off and Atlas backups inactive. Some login paths, recovery materials, live key associations, logs, and alert delivery remain unverified. Neon has not been configured or checked by this assessment. | Two-step sign-in for every provider login method; daily backups; timed restore; all five alerts delivered; rehearsed emergency guide. H1, I1 to I4. |

The existing protections are useful. They include bcrypt password hashing, scoped student reads and writes, selected admin response fields, database-role checks for admin test mutations, no application screenshot persistence, student approval of analytics snapshots, and a deterministic scheduling policy. None resolves the blockers above by itself.

## Prioritized remediation plan

The owner is the accountable person for provider settings, accepted risks, releases, and launch approval. Application work can be assigned later. Implementation tickets have not been created because this issue covers planning only.

| Order | Work and dependency | Evidence needed to finish |
| --- | --- | --- |
| 0. Contain the current access risk | Stop local scripts and tests that save real data. Create isolated local access before any database-writing development. Replace the four copied real-site credentials and revoke the old ones. Keep the existing no-promotion rule and interim Anthropic controls. | Redacted environment-separation evidence, old-credential rejection, and script refusal. Do not print secret values. |
| 1. Settle Neon access and build the isolated foundation | Follow the access rules below. Implement the Postgres schema and query layer against an isolated database first. Use separate projects for the test copy and the real site. Preserve ownership links and weekly schedule immutability. Add a fake extractor before paid-feature tests. | Synthetic integration checks on disposable data. App role cannot change roles or schema. Account and schedule behavior still meet the domain rules. |
| 2. Establish the controlled real-site transition | Configure limited Neon access, backups, provider two-step sign-in, separate Google clients, and separate keys. Recreate the two admins under the approved account rules. Update provider disclosures. Retire Atlas after the new accounts work. Disable automatic production releases. | Dated provider evidence and bounded transition checks. No student data transfer is expected; recheck the account inventory before the transition. |
| 3. Fix accounts and permissions | Build current-account guards, session revocation and lifetimes, Google stable-ID association, Google-only admins, email verification, password policy, recovery, and recent sign-in. Choose the email provider and sending domain as already deferred to implementation. | Account and isolation checks pass on the copy. Old sessions stop working. No silent email verification or role change. |
| 4. Bound abuse and paid work | Build shared atomic counters, upload validation, extraction-handler guards, output validation, budget accounting, timeout/concurrency controls, the database switch, and manual analytics entry. The required snapshot and extraction quotas apply to admin student sides too. | Boundary and concurrent-request checks pass. A refusal starts no costly work. Paid checks use only the separately scoped $5 test workspace. |
| 5. Complete browser, data, and operational protections | Add Origin/content-type checks, security headers, private-response protections, transactional deletion and onboarding, deletion replay after restore, retention jobs, safe errors, the security log, and final disclosures. Choose the privacy contact before launch. | Browser account-switching checks and disposable-database failure tests pass. Deleted records stay deleted after restore. Logs contain no secrets. |
| 6. Prove the complete release | Resolve current dependency advisories in parallel with the work above. Add runtime audit and secret scans to the automatic checks. Write and rehearse the emergency guide, restore procedure, credential drill, and alert delivery. Run the full launch checklist on one exact version and the short real-site checks. | Every checklist row has dated evidence for that version, or a specifically accepted risk with an end date. The owner then gives a separate written go decision. |

Orders 3 to 5 can overlap after their shared database and account boundaries exist. Urgent runtime dependency advisories follow the approved severity deadlines rather than waiting for order 6. A schema change or provider change must update the affected checklist and privacy claims in the same work.

## Neon access and monitoring decisions

The owner approved all three recommended choices on October 6, 2026. These replace the Atlas-specific infrastructure rules for Neon. They are required protections, not passing launch evidence or exceptions to the launch checks.

1. **Network access.** Keep Neon Launch with its public database endpoint. Use a SQL-created app role with only the required database connection, schema usage, table read/write, and sequence permissions. It has no `neon_superuser` membership, role-management power, or schema/database creation or deletion power. Each environment has separate random passwords of at least 32 characters. Every connection to Neon uses encryption and checks the server certificate. Revisit the network rule if the database provider or hosting plan changes, and use a private connection if it becomes available on the chosen plans at no extra cost.
2. **Owner administration.** Allow one permanent owner-only admin role for Neon's browser SQL editor. Its password is never stored in a local file or Vercel. This explicitly replaces the earlier rule against every permanent admin database role. Temporary script access has a password expiry within one week. After each job, disable its login, terminate its sessions, remove its privileges, and delete the temporary role. Password expiry alone does not end all access. Temporary passwords are not saved in files, Vercel, or logs. The app never uses owner or temporary admin access.
3. **Backup monitoring.** Prefer a separate monitoring account with Viewer access only to the production project, using a personal API key that inherits that read-only access. Verify that Neon's permissions model supports it. If it does not, the owner accepts a project-only Editor API key for a separate scheduled checker. An owner-wide personal API key is not allowed as the fallback. Keep the checker key in production secret settings. Expose it to neither browsers nor logs, and give it to no student-facing app path. Revoke it if exposed. The checker filters snapshots to the active production branch, checks that the newest snapshot is no more than 24 hours old, and alerts the owner on stale snapshots or a failed check. Record which access model was actually deployed.

The [additional Neon findings](issue-78-database-research.md#findings-added-during-the-final-assessment) record the facts behind these decisions. Project-only API keys have write powers, password expiry does not remove an admin role or end its open sessions, and Neon can keep its latest scheduled backup after the chosen retention period. The backup checks must inspect actual snapshot ages and handle deletion of expired copies. A retention setting alone does not pass the 30-day rule. Manual snapshots, restore branches, and retained latest scheduled snapshots all fall under the existing retention requirement.

The email provider, sending domain, and privacy contact remain explicit launch prerequisites. Earlier decisions assign their exact selection to implementation or to the owner before launch. They do not silently pass the account, provider, or disclosure checks. The assessment has no remaining policy question that prevents the remediation handoff.

## Accepted interim conditions

The [launch checklist](release-gate.md#accepted-risks) records the owner's no-backup risk acceptance. It ends November 1, 2026, or earlier when daily backups run. It does not permit promotion while the backup check fails. If the Neon move is incomplete by that date, the owner must approve an interim backup or explicitly renew the risk before expiry.

The owner also chose single-person provider ownership and a response within one day. Signup remains open without promotion by the prior owner decision. These choices do not accept the app findings or unverified provider settings as launch passes.

The interim Anthropic controls were changed on October 1: no auto-reload, no added credit, a $20 provider monthly ceiling, and spend emails at $5 and $8. These are dated observations and decisions. The separate $10 app extraction ceiling is an approved requirement that is not built yet.

## Standards reference and assessment limits

This assessment uses OWASP's Application Security Verification Standard, or ASVS, version **5.0.0**. The [pinned requirement list](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv) and the [primary-source mapping](issue-70-primary-sources.md#standard-and-requirement-identifiers) define the identifiers. The selected requirements do not establish a complete ASVS level or certification.

| Area | Applicable requirement identifiers |
| --- | --- |
| Ownership and current permissions | `v5.0.0-8.2.1`, `v5.0.0-8.2.2`, `v5.0.0-8.3.1`, `v5.0.0-8.3.2` |
| Identity, passwords, sessions, and sensitive account changes | `v5.0.0-10.5.2`, `v5.0.0-6.8.1`, `v5.0.0-6.2.4`, `v5.0.0-6.2.5`, `v5.0.0-6.2.8`, `v5.0.0-11.4.2`, `v5.0.0-7.3.1`, `v5.0.0-7.3.2`, `v5.0.0-7.4.1`, `v5.0.0-7.4.2`, `v5.0.0-7.5.3` |
| Abuse and paid operations | `v5.0.0-6.1.1`, `v5.0.0-6.3.1`, `v5.0.0-2.4.1` |
| Uploads, model output, and input validation | `v5.0.0-5.2.1`, `v5.0.0-5.2.2`, `v5.0.0-2.2.1`, `v5.0.0-2.2.2`, `v5.0.0-15.3.5` |
| Browser requests, private responses, and headers | `v5.0.0-3.5.1`, `v5.0.0-3.5.2`, `v5.0.0-14.3.2`, `v5.0.0-3.4.1`, `v5.0.0-3.4.3`, `v5.0.0-3.4.4`, `v5.0.0-3.4.5`, `v5.0.0-3.4.6` |
| Privacy, deletion, errors, and logs | `v5.0.0-14.1.2`, `v5.0.0-14.2.3`, `v5.0.0-14.2.4`, `v5.0.0-14.2.7`, `v5.0.0-16.2.5`, `v5.0.0-16.3.1`, `v5.0.0-16.3.2`, `v5.0.0-16.5.1`, `v5.0.0-16.5.3` |
| Dependencies and provider access | `v5.0.0-15.1.1`, `v5.0.0-15.1.2`, `v5.0.0-15.2.1`, `v5.0.0-13.2.1`, `v5.0.0-13.2.2`, `v5.0.0-13.3.1`, `v5.0.0-13.3.2` |

No production attack, sustained abuse, account takeover, cross-student disclosure through ownership filters, browser cache leak, or exploitable dependency path has been demonstrated by this synthesis. Known source gaps and missing launch evidence are sufficient to refuse readiness. Recovery also remains a project requirement; ASVS 5.0.0 has no standalone backup requirement.

Historical evidence retains its original dates and limitations. Closing a planning issue cannot turn that evidence into a passing release check. A final readiness claim must name the exact released version, provider settings, check dates, evidence, and current risk exceptions.

## Tracker resolution

The [resolution comment](https://github.com/Jahazel/lsat-scheduler/issues/69#issuecomment-6028227165) preserves the outcome, blockers, remediation order, and approved Neon rules in GitHub. The assessment closes as completed planning with a not-ready outcome. The documents were uncommitted when the issue closed. The owner subsequently approved committing them. Pushing still requires separate approval.
