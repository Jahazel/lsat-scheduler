# Production security and recovery evidence for issue 71

Assessment date: October 1, 2026, America/Chicago. Repository and production deployment source: `0b4e1fce67eaed3c011405425152fd0db39a0df1`. Scope: [issue 71](https://github.com/Jahazel/lsat-scheduler/issues/71), within the public-signup assessment in [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Application findings remain in [issue 70](issue-70-evidence.md).

The production domain uses HTTPS, generated deployment access requires Vercel authentication, and production secret variables are configured. Confirmed concerns include inactive Vercel and GitHub 2FA, an Atlas database user with administrative access, an unrestricted IPv4 database access-list entry, inactive Atlas backups, and shared credentials in the two local environment files. Recovery history and emergency ownership still need human evidence. These observations support the decisions in issues 72 and 73; they do not approve public launch.

## Evidence labels and limits

- **Observed** identifies a setting read from an authenticated provider dashboard or GitHub API on the assessment date.
- **Reproduced** identifies the result of a bounded unauthenticated HTTP HEAD request.
- **Local** identifies repository configuration or a comparison of local environment files. It does not establish the current deployed secret values.
- **Unverified** identifies missing evidence. It does not mean a protection is disabled.

No provider settings were changed, keys revealed or created, database records read or written, backups exported or restored, paid inference requested, or application fixes implemented. Three anonymous HEAD requests inspected public response metadata. Secret comparisons returned only booleans. The report excludes credential values, partial key strings, private IP addresses, billing details, and recovery codes. Existing untracked `docs/current-scheduling-rules-for-testing.md` and `output/` were left alone.

The provider dashboards were inspected through existing Chrome sessions. The user signed in to Atlas when its session was unavailable. GitHub checks used the existing `gh` authentication. Plugin discovery found an available, uninstalled Vercel integration; no installation was necessary.

## Vercel

Project: `lsat-scheduler`, team `jahazels-projects`, Hobby plan.

| Control | Evidence and status | Limit or implication |
| --- | --- | --- |
| Production identity | **Observed:** Overview reports Ready, branch `main`, source `0b4e1fc`, and domain `lsat-scheduler.vercel.app`. Domains reports Valid Configuration and Production. | This identifies the inspected deployment. Future pushes can change it. |
| HTTPS | **Reproduced:** HTTP `/` returns 308 to HTTPS. HTTPS `/` returns 200 with certificate validation enabled and HSTS `max-age=63072000; includeSubDomains; preload`. | No TLS-version/cipher scan or authenticated-route test was performed. |
| Production and deployment access | **Observed:** Require Log In checked, Standard Protection selected. Password and trusted-IP methods are not enabled. **Reproduced:** the current generated deployment URL returns 302 to Vercel SSO without a cookie. | Production domain remains public by design. One generated URL was checked; no separate preview was exercised. |
| Protection exceptions | **Observed:** no automation bypass secrets or deployment-protection exception domains listed; OPTIONS bypass unchecked; protected sourcemaps enabled. This project is a trusted OIDC source for matching environments, with development tokens also allowed into preview. | Shareable links are managed per deployment and were not inventoried. Protection does not establish safe application authorization. |
| Environment variables | **Observed:** `MONGODB_URI`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` each appear as Secret variables scoped to Production. Values remained unopened. System environment-variable access enabled. | Shared/inherited variables and complete preview runtime behavior remain unverified. Scope alone does not establish distinct local credentials. |
| Deployment authority | **Observed:** Vercel Overview says pushes to `main` update Production. Team Members lists one Owner. | Vercel can deploy changes without a GitHub Actions workflow. A separate release-approval control was not established. |
| Privileged-account MFA | **Observed:** Account Settings > Authentication reports Two-Factor Authentication Inactive and zero registered passkeys. Email, Google, and GitHub sign-in methods exist. | Google 2-Step Verification does not protect every available Vercel login method. Recovery-code custody and team enforcement remain unverified. |
| Abuse controls | **Observed:** Firewall active, System Mitigations Active, Custom Rules 0, Bot Protection Inactive, and no enforced custom rules shown. | Platform mitigations are not evidence of per-student extraction quotas or login-specific limits. Application limits are absent in issue 70 F05. |
| Spending | **Observed:** Hobby plan. Provider documentation describes Hobby resource-limit pausing; configurable Spend Management is a Pro feature. | No configurable project spend threshold was observed. Vercel limits do not cap Anthropic spending. Actual resource-exhaustion behavior was not tested. |
| Logging and alerts | **Observed:** Logs and Observability are available. Alerts and Drains settings show upgrade prompts. | Log retention, redaction, actual security-event capture, access history, notification delivery, and external monitoring remain unverified. |
| Emergency shutdown | **Observed:** General settings exposes Pause Project; Overview exposes Instant Rollback. Neither was invoked. | Pause Project describes stopping Production while leaving previews unaffected. Rollback cannot restore database contents or revoke leaked credentials. |

Public HTTPS `/` also returned `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. It did not return CSP, `X-Content-Type-Options`, `Referrer-Policy`, or `X-Frame-Options`. This is a reproduced observation for the landing response only. It does not establish private-page caching, cookie attributes, or headers on every route. The generated URL's `X-Frame-Options: DENY` belongs to its protection response, not the application response.

Evidence locations: [Overview](https://vercel.com/jahazels-projects/lsat-scheduler), [Domains](https://vercel.com/jahazels-projects/lsat-scheduler/settings/domains), [Deployment Protection](https://vercel.com/jahazels-projects/lsat-scheduler/settings/deployment-protection), [Environment Variables](https://vercel.com/jahazels-projects/lsat-scheduler/settings/environment-variables), [Firewall](https://vercel.com/jahazels-projects/lsat-scheduler/firewall), [Authentication](https://vercel.com/account/settings/authentication), [Members](https://vercel.com/jahazels-projects/~/settings/members), [Alerts](https://vercel.com/jahazels-projects/lsat-scheduler/settings/alerts), [Drains](https://vercel.com/jahazels-projects/lsat-scheduler/settings/drains). These require authorized provider access.

## MongoDB Atlas

Inspected project: `lsat-scheduler`, cluster `Cluster0`.

| Control | Evidence and status | Limit or implication |
| --- | --- | --- |
| Deployment | **Observed:** Free tier, MongoDB 8.0.32, three-node replica set in AWS us-east-1. | Replication does not recover an accidental deletion that replicates to all nodes. |
| Network access | **Observed:** active `0.0.0.0/0` entry, described as supporting Vercel dynamic outbound IPs. Other individual address entries also exist. | Any IPv4 source can attempt database authentication. This is not evidence of unauthenticated database access. |
| Database permissions | **Observed:** one SCRAM database user, `atlasAdmin@admin`, All Resources. Both local URI usernames match that observed user, without printing the username or URI. | The application's copied credentials have administrative permissions rather than access limited to the app database. Current deployed-value association still needs confirmation. |
| Backend TLS | **Local:** both copied URIs use `mongodb+srv`; no options that disable TLS or certificate validation were found. | Actual deployment connection negotiation and complete provider encryption configuration were not inspected. |
| Privileged access | **Observed:** project Users lists one Project Owner. MongoDB account security shows a linked Google account, Set Password, and disabled native MFA setup controls. The linked Google account has 2-Step Verification on. Organization Settings has Require MFA off and explains that federated Google/GitHub/SSO logins are exempt from its prompt. | Google MFA is supporting evidence for this identity. Organization-wide owner inventory and every possible recovery path were not established. |
| Administration API and sessions | **Observed:** organization requires an IP access list for Administration API keys/service accounts. Atlas UI absolute session timeout is 12 hours; idle timeout None. | The Administration API restriction is separate from the database's `0.0.0.0/0` entry and exempts delegated App Connections. These timeouts do not govern DrillMap student sessions. |
| Backups | **Observed:** Clusters explicitly reports Backups Inactive. Backup page offers upgrades for daily/continuous backups. | Atlas documentation says managed backups are unavailable for Free clusters. Any independently scheduled dumps or other backups remain unverified. |
| Restore and retention | **Unverified:** latest recoverable backup, encryption/access, retention, deletion handling, restore history, recovery time, and acceptable data loss. | The application's 30-day encrypted-backup statement in [privacy/page.tsx](../../src/app/legal/privacy/page.tsx) is not established by this configuration. No restore test was performed. |
| Alerts | **Observed:** Alert Settings has enabled email rules addressed to Project Owner, including storage write blocking and replica-set primary loss; a project-join alert goes to all project users. | Presence of checked rules does not prove every rule applies to Free tier or that email arrives. No test alert was triggered. |
| Security contacts and logs | **Observed:** Overview warns that designated security and operations contacts are missing. Activity Feed is available. | Database-operation auditing, log retention/export/redaction, failed-authentication alerts, and incident response outside the owner remain unverified. |

Evidence locations in Atlas: `lsat-scheduler` > Clusters, Backup, Database & Network Access > Database Users and IP Access List, Project Identity & Access > Users, Project Alerts > Alert Settings, and [MongoDB account Login and Security](https://account.mongodb.com/account/profile/security).

## GitHub

Repository: `Jahazel/lsat-scheduler`, private, default branch `main`.

| Control | Evidence and status | Limit or implication |
| --- | --- | --- |
| Access | **Observed API:** private repository, not archived, collaborator listing returns one administrator, `Jahazel`. | Installed-app grants, deploy keys, other token holders, and pending invitations were not exhaustively inventoried. |
| Privileged-account MFA | **Observed dashboard:** Password and authentication states that two-factor authentication is not enabled. Password and Google sign-in are configured. | The `gh api user` MFA field returned null and alone would have been inconclusive. The dashboard supplies the finding. |
| Branch protection | **Observed API limitation:** protection and ruleset endpoints return 403 with a message requiring GitHub Pro or a public repository. | This establishes a plan restriction, not a successful read of an empty policy. Required reviews/status gates remain unverified. Making the repository public is not proposed as a remedy. |
| Dependabot alerts | **Observed API:** explicit message that alerts are disabled. | This is a confirmed setting, not an inference from lack of permission. |
| Secret scanning | **Observed API:** explicit message that secret scanning is disabled. | No provider scan result or historical secret-exposure determination is available. Do not interpret this as a clean secret scan. |
| Actions | **Observed API:** enabled, allowed actions `all`, SHA pinning not required; zero workflows returned. No tracked `.github` workflow configuration exists. | No Actions-based release/security gate is established. Vercel's Git integration is a separate deployment path. |
| Recovery and logs | **Local:** existing checkout retains Git history. **Observed dashboard:** account Security log is available. | Independent repository backup, secure recovery-code storage, token inventory/rotation, security-log retention and alerts, and backup operator access remain unverified. |

Read-only API checks used `gh api` for the repository, collaborator listing, `branches/main/protection`, `rulesets`, `actions/permissions`, `actions/workflows`, `dependabot/alerts`, `secret-scanning/alerts`, and recent `deployments`. Alert bodies were not printed. Dashboard MFA evidence: [Password and authentication](https://github.com/settings/security).

## Google OAuth and Google Cloud

Inspected Cloud project: DrillMap. One Web application client named DrillMap Web appears in Clients.

| Control | Evidence and status | Limit or implication |
| --- | --- | --- |
| Origin and callback | **Observed:** one JavaScript origin, `https://lsat-scheduler.vercel.app`; one redirect, `https://lsat-scheduler.vercel.app/api/auth/callback/google`. Client secret status Enabled. | No wildcard, localhost, or preview redirect is listed on this client. Its association with the current deployed `AUTH_GOOGLE_ID` value was not verified by opening secrets. |
| Audience | **Observed:** External, Testing, no listed test users, Publish app disabled pending Branding completion. | Testing alone does not prove Google sign-in is blocked. Google exempts basic sign-in scopes from the test-user restriction and seven-day expiry. |
| Scopes | **Observed:** Data Access tables contain no declared non-sensitive, sensitive, or restricted scopes. **Local:** no custom scopes in `src/auth.ts`; installed Auth.js defaults authorization to `openid profile email` in `@auth/core/lib/utils/providers.js`, lines 46-48. | Empty consent tables do not mean the authorization request asks for no scopes. These local scopes support Google's Testing exception; actual deployed consent remains untested. |
| Branding | **Observed:** app name and support/developer contact configured; home, privacy-policy, and terms links empty. Authorized domain is the production Vercel hostname. | Completing the branding/publishing configuration is a subsequent task. This audit did not publish or request verification. |
| Privileged accounts | **Observed:** project IAM lists one human Owner. That account's security page reports 2-Step Verification On and one passkey. | Recovery-material custody and emergency access by another person remain unverified. This does not require or prove MFA for all student Google accounts. |
| Logging | **Observed:** default Data Access audit configuration reports Admin read, Data read, and Data write Disabled. | This does not mean all Cloud Audit Logs are off. Admin Activity logging is separate. OAuth security alert delivery and service-specific logging/export/retention remain unverified. |

Evidence locations: Google Cloud > DrillMap > Google Auth Platform > Clients, Audience, Data Access, Branding; IAM & Admin > IAM and Audit logs; [Google account security](https://myaccount.google.com/security). Personal recovery details are excluded from this report.

## Anthropic

Inspected Claude Console organization: the owner's Individual Org.

| Control | Evidence and status | Limit or implication |
| --- | --- | --- |
| Isolation and key scope | **Observed:** one active Default workspace and one legacy API key named `lsat-scheduler-dev`, scoped to Default, without a displayed expiration date. Organization is an Individual Org; signed-in role is Admin. | The key name does not prove it is restricted to development. Association with the current deployed key and alternative account login/recovery paths remain unverified. |
| Spending | **Observed:** monthly organization limit $500. Credit balance $4.68 at inspection; auto-reload off; billing states requests stop when credits run out. No notification thresholds listed under Email notifications. | Prepaid exhaustion currently provides an additional stop, but funds can be added later. The limit covers the organization, not each student. No cap or credit-exhaustion test was sent. |
| Rate limits | **Observed:** Evaluation tier. Haiku 4.x quotas show 1,000 requests/minute, 500,000 input tokens/minute excluding cache reads, and 80,000 output tokens/minute. | These are organization quotas. They do not prevent one student from consuming shared capacity or replace application controls. |
| Retention | **Observed:** organization default On, 30 days. | Zero Data Retention is not enabled in the displayed setting. Contractual exceptions, safety/legal retention, and key-to-organization association remain relevant. The app's lack of image storage does not imply Anthropic discards images immediately. |
| MFA and alerts | **Unverified:** Console admin MFA, authentication methods, recovery custody, security-event logging/alerts, and notification delivery. | The inspected Console settings did not establish these protections. Google MFA alone does not establish the Console's permitted login paths. |
| Emergency control | **Observed:** existing key inventory is accessible; no revoke action was executed. **Local:** no extraction-disable switch or quota in the application. | A planned revocation must happen at the provider to invalidate copies, including older deployments. Workspace archiving is irreversible and is not a default shutdown procedure. |

Evidence locations: [Billing](https://platform.claude.com/settings/billing), [Rate limits](https://platform.claude.com/settings/limits), [Workspaces](https://platform.claude.com/settings/workspaces), [API keys](https://platform.claude.com/settings/keys), [Data retention](https://platform.claude.com/settings/privacy), and [Identity and access](https://platform.claude.com/settings/identity). No key values were revealed.

## Local environment separation

Both `.env.local` and `.env.vercel.local` contain nonempty MongoDB, Anthropic, Auth.js, and Google credential variables. Their values were compared in memory and omitted from output.

| Comparison | Local result |
| --- | --- |
| Anthropic key | Equal |
| Auth.js secret | Equal |
| Google client ID and secret | Equal |
| MongoDB URI as a complete string | Different |
| MongoDB host, username, password, and URI database path | Equal |
| Effective app database name | [db.ts](../../src/lib/db.ts) always selects `lsat-scheduler` |

A different URI string is therefore not evidence of a different database. The files supply no observed development/production credential boundary. Their equality is a verified local fact; current deployment equality depends on the provenance of `.env.vercel.local`, which awaits the user's confirmation. Both files are ignored by [.gitignore](../../.gitignore). This is not a history-wide secret scan or proof that local credentials never reached another system.

## Recovery and emergency evidence still needed

The [human checklist](issue-71-human-checklist.md) requests only evidence unavailable from the inspected configuration. Asked about external backups, restore history, production-copy provenance, and alternate incident ownership, the user replied "None I think??". This is an uncertain answer, not verified absence or a confirmation of current production values. External backups and restore history are recorded as unknown, with the user believing none exist. Recovery-material custody, alternate incident ownership, and current production-copy provenance also remain unverified. Recording an honest `none` or `unknown` is sufficient evidence for a subsequent decision; it is not permission to perform a restore or change settings.

Available emergency controls were inspected, but their complete use and verification were not rehearsed. A future runbook should cover Vercel Production pause plus previews/shareable links, provider-side key and database credential revocation, Google client-secret rotation, GitHub app/token/deploy access, and app session revocation. Issue 70 F01/F02 establishes that changing a database role or deleting a User does not reliably revoke existing JWT claims. Environment changes alone should not be presented as immediate revocation for every existing deployment.

## Standards and provider references

ASVS references are pinned to [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv). These identify relevant application assurance questions, not certification of third-party providers. They supplement the mappings in [issue 70's source note](issue-70-primary-sources.md).

| Evidence area | Applicable identifiers |
| --- | --- |
| Public TLS and headers | `v5.0.0-12.2.1`, `v5.0.0-12.2.2`, `v5.0.0-3.4.1`; missing landing headers relate to `v5.0.0-3.4.3`, `v5.0.0-3.4.4`, `v5.0.0-3.4.5`, `v5.0.0-3.4.6`. TLS protocol/cipher requirements `v5.0.0-12.1.1` and `v5.0.0-12.1.2` remain unverified. |
| Backend authentication, least privilege, secrets | `v5.0.0-13.2.1`, `v5.0.0-13.2.2`, `v5.0.0-13.3.1`, `v5.0.0-13.3.2`. Static privileged credentials and shared local copies need review. |
| MFA and emergency session invalidation | `v5.0.0-6.3.3`, `v5.0.0-7.4.1`, `v5.0.0-7.4.2`. Provider account MFA is supporting operational evidence, not a passing app-MFA assessment. |
| Abuse and paid operations | `v5.0.0-6.1.1`, `v5.0.0-6.3.1`, `v5.0.0-2.4.1`. Platform/org quotas do not establish these app protections. |
| Privacy, backups, retention | `v5.0.0-14.1.2`, `v5.0.0-14.2.3`, `v5.0.0-14.2.4`. ASVS 5.0.0 has no standalone backup requirement; recovery is also an issue-specific operational requirement. |
| Logs and private response caching | `v5.0.0-16.2.5`, `v5.0.0-16.3.1`, `v5.0.0-16.3.2`, `v5.0.0-14.2.2`, `v5.0.0-14.3.2`. Public HEAD results do not close private-response checks. |

Primary documentation checked on the assessment date:

- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) explains Standard Protection's production-domain exception. The observed dashboard setting supplies project evidence.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby), [resource-limit pausing](https://vercel.com/changelog/spend-management-now-pauses-production-deployments-by-default), and [Spend Management](https://vercel.com/docs/spend-management) distinguish plan limits, notifications, and pause actions.
- [Vercel account management](https://vercel.com/docs/accounts) and [2FA](https://vercel.com/changelog/2fa-is-now-available) describe login methods and account MFA.
- [Atlas backup and restore](https://www.mongodb.com/docs/atlas/backup-restore-cluster/) states that managed backups are unavailable on Free clusters and distinguishes backup/restore permissions.
- [Google audience rules](https://support.google.com/cloud/answer/15549945?hl=en) explicitly exempts basic Google sign-in from Testing restrictions. This prevents treating Testing as a reproduced signup failure.
- [Anthropic rate limits](https://platform.claude.com/docs/en/api/rate-limits), [workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces), and [data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) distinguish organization limits, workspace isolation, and contractual retention. Default-workspace limits cannot be customized independently.

## Handoff to issues 72 and 73

The available evidence collection is complete. Decisions now have provider evidence for privileged-account MFA, database permissions/network exposure, backups, credential separation, abuse/spend coverage, logging limits, and OAuth configuration. No code or provider remediation was attempted. The user's uncertain recovery answer and unverified production associations are recorded without treating them as passes or confirmed absences.

On October 1, 2026, the user authorized closing issue 71. The [closure summary](https://github.com/Jahazel/lsat-scheduler/issues/71#issuecomment-5940024276) preserves the main findings and limitations in GitHub, and issue 69's Decisions so far links to it. Issue 71 is closed as completed evidence collection. Issues 69, 72, and 73 remain open for protection decisions, acceptance checks, recovery/alert ownership, and launch readiness. Closure does not accept the risks or authorize deployment. These local documents remain uncommitted.
