# DrillMap security evidence for issue 70

Audit date: October 1, 2026. Scope: the existing checkout at commit `81f32fadeb9b95b90a15adeb85fdc2b5f2839cc5`, its lockfile, installed framework source, and synthetic local tests. [Issue 70](https://github.com/Jahazel/lsat-scheduler/issues/70) requests evidence for subsequent security decisions. This report supplies that evidence; it does not approve a launch.

No application fixes, dependency updates, database operations, production requests, deployment changes, or secret-value inspection were performed. Existing untracked `docs/current-scheduling-rules-for-testing.md` and `output/` were left alone. New files are this report, the [primary-source note](issue-70-primary-sources.md), and two evidence test files in this directory.

## How to read the conclusions

- **Verified** means the cited source or synthetic test establishes the specific observation. Source-only verification does not establish deployed behavior.
- **Suspected** means a plausible impact depends on an untested condition. The report identifies that condition.
- **Unverified** means the necessary evidence was unavailable or outside this audit's scope.

ASVS identifiers use `v5.0.0-` throughout. The [versioned OWASP requirements](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv) and [source note](issue-70-primary-sources.md) contain the mappings and minimum levels. These are applicable references, not a complete ASVS assessment, compliance score, or agreed assurance target. Immediate permission updates and sensitive-operation reauthentication include Level 3 requirements; their presence here does not impose a Level 3 launch requirement.

## What the evidence establishes

Student profile, snapshot, history, and check-in paths derive ownership from the session. Admin test mutations recheck the database role and act on the admin's own student records. Passwords use bcrypt, the screenshot path does not persist images, and snapshot approval validates numeric ranges and confirmation fields.

The most consequential confirmed gaps are stale admin authorization on roster reads, session claims surviving account deletion, email-based Google account association, missing application abuse limits, unbounded screenshot buffering, and unchecked model output. The lockfile also matches runtime advisories for Next.js and sharp. Account takeover, production exhaustion, cross-site request forgery, cache disclosure, and advisory exploitation remain unproven.

## Complete application route inventory

The file inventory contains 13 page routes and 5 Route Handler files. All inventory entries below are **verified by source inspection**. The methods listed are explicit exports; Next.js also supplies method handling such as OPTIONS and applicable HEAD behavior. There are no additional application Route Handler files or inline Server Actions in `src`.

[Proxy](../../src/proxy.ts), lines 9-36, treats `/`, `/login`, `/signup`, and the three legal pages as public. It bypasses paths starting with `/api/auth`, redirects other anonymous requests to `/login`, and restricts `/admin` using the session role. Its matcher excludes `_next/static`, `_next/image`, and `favicon.ico`. API handler status codes below describe direct handler execution; Proxy can redirect an anonymous HTTP request before its handler returns 401 or 403. Production traversal was not tested.

| Page route | Source | Local checks, reads, and side effects |
| --- | --- | --- |
| `/` | [page.tsx](../../src/app/page.tsx) | Public landing page; invokes public lead capture. |
| `/login` | [login/page.tsx](../../src/app/login/page.tsx) | Public credential and Google sign-in UI; Proxy redirects existing sessions by role. |
| `/signup` | [signup/page.tsx](../../src/app/signup/page.tsx) | Public signup and Google sign-in UI; Proxy redirects existing sessions. |
| `/legal/terms` | [terms/page.tsx](../../src/app/legal/terms/page.tsx) | Public static copy. |
| `/legal/privacy` | [privacy/page.tsx](../../src/app/legal/privacy/page.tsx) | Public data/deletion/backup claims; see F11 for limits on their verification. |
| `/legal/ai-disclosure` | [ai-disclosure/page.tsx](../../src/app/legal/ai-disclosure/page.tsx) | Public placeholder copy. |
| `/onboarding` | [onboarding/page.tsx](../../src/app/onboarding/page.tsx), lines 9-20 | Auth check; existing Student lookup by session user ID; existing profiles redirect. |
| `/dashboard` | [dashboard/page.tsx](../../src/app/dashboard/page.tsx), lines 24-69 | Auth check; own Student and analytics. GET rendering can create a weekly schedule and initialize check-ins through `loadOrGenerateCurrentWeek`. History redirects encode the query value into a fixed local destination. |
| `/progress` | [progress/page.tsx](../../src/app/progress/page.tsx), lines 21-38 | Auth check; own Student, schedules, and their check-ins. `week` selects from that already scoped history; it does not supply a foreign student ID. |
| `/settings` | [settings/page.tsx](../../src/app/settings/page.tsx), lines 10-25 | Auth check; own Student; prepares allowed profile fields for editing. |
| `/account` | [account/page.tsx](../../src/app/account/page.tsx), lines 9-20 | Auth check; own Student and session email; invokes account deletion. |
| `/admin` | [admin/page.tsx](../../src/app/admin/page.tsx), lines 10-20 | Session admin role only; reads student roster and approved snapshot student IDs across accounts. No current-role database guard. |
| `/admin/students/[id]` | [admin student page](../../src/app/admin/students/[id]/page.tsx), lines 13-32 | Session admin role only; lookup by supplied ID; missing/orphan/admin-owned records excluded. Read-only schedule loader cannot create or save records. No current-role database guard. |

The [root layout](../../src/app/layout.tsx) reads the session and renders navigation. It is not a replacement for page, action, or handler authorization. Loading/error UI and `favicon.ico` do not add application data endpoints.

| Handler route | Methods | Source and local policy |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET, POST | [auth handler](../../src/app/api/auth/[...nextauth]/route.ts) delegates to Auth.js. Sign-in, provider callbacks, sign-out, session, providers, CSRF, error, and framework utility paths share this catch-all. Not every framework utility is usable with the configured credentials/Google providers. |
| `/api/analytics/extract` | POST | [extract/route.ts](../../src/app/api/analytics/extract/route.ts), lines 9-23. Proxy-only authentication; no auth call in the handler. Requires a File, buffers all bytes, sends to Anthropic. No Student lookup or persistent write. Missing file returns 400; extraction/type/SDK errors return generic 502. Multipart/arrayBuffer failures precede the catch. |
| `/api/analytics` | POST | [analytics/route.ts](../../src/app/api/analytics/route.ts), lines 12-51. Auth check, own Student lookup, validated append-only snapshot creation. Admin sample source additionally requires current database admin. Returns 401, 422, 403, or 404 for explicit rejection branches and 201 on success; unexpected database errors escape. |
| `/api/students` | GET | [students/route.ts](../../src/app/api/students/route.ts), lines 7-18. Session admin role, otherwise 403; reads all eligible student records and returns a selected DTO. No pagination or current-role guard. |
| `/api/students/[id]` | GET | [student route](../../src/app/api/students/[id]/route.ts), lines 8-24. Session admin role, otherwise 403; reads selected student DTO, missing record returns 404. No ObjectId syntax validation or current-role guard. |

Auth.js method dispatch and CSRF validation are visible in installed `node_modules/@auth/core/lib/index.js`, lines 24-80. Credentials callback POST, session update POST, sign-in POST, and sign-out POST have framework CSRF validation. Next.js Server Action Origin checks must not be assumed for the separate JSON/multipart handlers.

Framework routes also matter to dependency reachability. `/_next/image` bypasses Proxy even though the application has no `next/image` imports. Static assets, RSC responses, and Server Action POST requests are generated by Next.js. This source inventory does not assert that unused framework handlers are unreachable in deployment.

## Complete Server Action inventory

There are 15 exported async actions across 8 `"use server"` modules. They require direct-call review because hiding a button or guarding a page does not authorize the action. [Installed Next.js data-security guidance](../../node_modules/next/dist/docs/01-app/02-guides/data-security.md), lines 279-291 and 546-550, documents direct POST reachability and Origin/Host comparisons. The default Server Action body limit is 1 MB; the multipart extraction Route Handler is separate.

| Action | Source | Authentication, ownership, input, and effects |
| --- | --- | --- |
| `captureLead` | [app/actions.ts](../../src/app/actions.ts), line 16 | Intentionally public. Zod email validation; creates Lead with normalized email. No deduplication, confirmation, or rate limit. |
| `login` | [login/actions.ts](../../src/app/login/actions.ts), line 14 | Intentionally public. Delegates credential verification, returns generic AuthError wording; looks up normalized email for a fixed role-based redirect. |
| `signInWithGoogle` in login | [login/actions.ts](../../src/app/login/actions.ts), line 35 | Intentionally public; starts Google authentication with fixed `/login` redirect. |
| `signup` | [signup/actions.ts](../../src/app/signup/actions.ts), line 28 | Intentionally public. Terms checkbox and Zod name/email/password; checks duplicate email; bcrypt cost 10; creates student role; signs in. No email ownership verification. |
| `signInWithGoogle` in signup | [signup/actions.ts](../../src/app/signup/actions.ts), line 58 | Intentionally public; starts Google authentication with fixed `/onboarding` redirect. |
| `createStudentProfile` | [onboarding/actions.ts](../../src/app/onboarding/actions.ts), line 15 | Auth check; Zod profile allowlist; owns Student via session ID; optional approval validated before profile creation. Student and snapshot writes have no shared transaction. Runtime row shape is not validated before `summarizeAnalyticsRows`. |
| `updateStudentProfile` | [account/actions.ts](../../src/app/account/actions.ts), line 18 | Auth check; Zod profile allowlist drops analytics/ownership/operator keys; update filter uses session user ID. No current-User existence check. |
| `deleteAccount` | [account/actions.ts](../../src/app/account/actions.ts), line 41 | Auth check; blocks session admin role; requires literal `DELETE`. Cascades own analytics, check-ins, schedules, Student, and User, then signs out this browser. No reauthentication, transaction, or other-session revocation. |
| `saveActivityCheckIn` | [dashboard/actions.ts](../../src/app/dashboard/actions.ts), line 20 | Zod input, then auth; Student by session ID; schedule by ID and student ID; verifies activity existence/canonical ID; scoped upsert. Finite nonnegative actualMinutes, without an upper bound. |
| `setSimulatedDate` | [admin test actions](../../src/app/admin/test/actions.ts), line 15 | Current database admin guard; validated string plus workspace date rules; updates own simulated date. |
| `generateTestSample` | [admin test actions](../../src/app/admin/test/actions.ts), line 26 | Current database admin guard; direction enum; returns sample rows for own workspace. |
| `rebuildThisWeek` | [admin test actions](../../src/app/admin/test/actions.ts), line 36 | Current database admin guard; removes own eligible current week for subsequent generation. |
| `resetTestData` | [admin test actions](../../src/app/admin/test/actions.ts), line 42 | Current database admin guard; transactional reset of own schedules/check-ins/snapshots. |
| `resetEverything` | [admin test actions](../../src/app/admin/test/actions.ts), line 48 | Current database admin guard; transactional reset of own workspace/profile/date. Does not delete User account. |
| `logOut` | [nav/actions.ts](../../src/components/nav/actions.ts), line 5 | Delegates signOut for current browser with fixed `/` redirect; no account-wide revocation. |

## Findings and supporting evidence

### F01. Session role claims outlive database changes

**Verified gap.** [auth.ts](../../src/auth.ts), lines 57-77, returns the existing token whenever Auth.js supplies no sign-in user. Both admin pages and both student API handlers authorize using that role alone. The evidence tests supply an admin claim with a database user now marked student: roster and individual reads return 200, while [requireCurrentAdmin](../../src/lib/requireAdmin.ts), lines 6-13, rejects the same identity. ASVS `v5.0.0-8.2.1`, `v5.0.0-8.3.1`, and `v5.0.0-8.3.2`.

Impact: someone retaining a previously issued admin session can continue to read other students' data after demotion. The database guard protects admin sample approval and all five admin test actions. The test mocks identity state; a real demotion/cookie exercise was not performed.

### F02. Account deletion and logout do not revoke other JWT copies

**Verified source gap.** The application uses JWT sessions with no adapter, revocation list, session version, or existing-user lookup on ordinary session refresh. [Account deletion](../../src/app/account/actions.ts), lines 41-71, deletes the User and signs out the current browser. It does not revoke a cookie held in another browser or a copied cookie. The callback test retains a deleted user's claims without a database read. ASVS `v5.0.0-7.4.1`, `v5.0.0-7.4.2`, `v5.0.0-7.3.1`, and `v5.0.0-7.3.2`.

Installed Auth.js defaults maxAge to 30 days in `@auth/core/lib/init.js`, lines 38 and 72-84, and refreshes expiry when serving a JWT session in `lib/actions/session.js`, lines 38-75. The app does not define an absolute lifetime. A claim that all sessions end exactly 30 days after sign-in would therefore be unsupported. **Suspected impact:** a retained deleted-user token can reach authenticated operations, including paid extraction, until invalidated/expired. Most data operations still require a Student and therefore reject after its deletion; onboarding does not independently establish that its session User still exists. No live deletion or orphan creation was attempted.

### F03. Google association trusts normalized email rather than a stored provider subject

**Verified gap; takeover is suspected.** [auth.ts](../../src/auth.ts), lines 44-65, associates Google sign-in with an existing User by email and copies that User's role. [User schema](../../src/models/User.ts), lines 16-23, stores no Google subject/provider account identifier or verified-email state. The application callback does not inspect `email_verified`. Its synthetic callback test accepts a false verified-email profile and selects an existing admin record. ASVS `v5.0.0-10.5.2` and `v5.0.0-6.8.1`.

Google's [OIDC guidance](https://developers.google.com/identity/openid-connect/openid-connect#an-id-tokens-payload) requires stable `sub` for identity and warns against using mutable email as the primary identifier. Auth.js protocol validation still applies before this callback. The test does not forge a signed ID token, bypass issuer/audience validation, or prove Google will issue the tested profile to an attacker.

Credential signup also permits registration of another person's email without verification. **Suspected impact:** an attacker who pre-registers an address may retain a password for the User later adopted by its legitimate Google owner. This depends on registration order and the address being unused; no victim account was exercised.

### F04. Password handling has useful protections and specific policy gaps

**Verified protection.** [Credentials authorization](../../src/auth.ts), lines 20-36, rejects non-string email/password, normalizes email, and compares a bcrypt hash. The operator-object test never reaches MongoDB. Signup forces the student role and hashes with bcrypt cost 10. ASVS `v5.0.0-1.2.4`, `v5.0.0-6.2.1`, and `v5.0.0-11.4.2`. Cost 10 exists in code; adequacy under deployment load was not benchmarked.

**Verified gaps.** [Signup schema](../../src/app/signup/actions.ts), lines 9-16, requires at least eight characters with letters and digits, has no common/breached-password check, and imposes no byte bound before bcrypt. The test hashes a 72-byte prefix plus one suffix; bcrypt accepts a different suffix after that same prefix. ASVS `v5.0.0-6.2.4`, `v5.0.0-6.2.5`, `v5.0.0-6.2.8`, and `v5.0.0-6.2.12`. This is a truncation collision, not a bypass for unrelated short passwords.

**Verified enumeration behavior.** Signup returns a specific existing-email message at lines 46-48. Login returns generic wording, but missing user/hash returns before bcrypt while a wrong password runs bcrypt. The timing difference is **suspected enumeration**; it was not measured through HTTP. No password reset, password change, application MFA, or email verification flow exists in the route/action inventory. Google-side MFA and recovery policy are unverified.

### F05. The app contains no authentication or expensive-operation abuse limits

**Verified source gap.** Review of all actions/handlers, [auth.ts](../../src/auth.ts), [lead capture](../../src/app/actions.ts), and [extractor](../../src/lib/claudeExtract.ts) found no rate limiter, lockout, per-user quota, CAPTCHA, request concurrency cap, or security event counters. ASVS `v5.0.0-6.1.1`, `v5.0.0-6.3.1`, and `v5.0.0-2.4.1`.

Impact depends on deployment controls. Credential guessing consumes hash/DB work; signup/lead writes can create storage load; authenticated extraction can consume paid provider requests. The public lead path also accepts repeated valid addresses because [Lead schema](../../src/models/Lead.ts) has no uniqueness constraint. Provider/platform rate controls are **unverified**, and no brute-force or load test was sent.

### F06. Screenshot authentication is enforced only by Proxy

**Verified source gap.** The extraction handler makes no auth call. Its direct-call test succeeds with an anonymous session mock. Proxy normally redirects unauthenticated requests to this route. ASVS `v5.0.0-8.2.1` and `v5.0.0-8.3.1`.

The result proves missing handler authorization, not an anonymous production bypass. Exploitability depends on circumventing Proxy or future routing/configuration changes. There is no Student-record requirement by design because extraction is used during onboarding. A direct test does not traverse Next.js Proxy.

### F07. Upload bytes are buffered without application size or content checks

**Verified gap.** [extract route](../../src/app/api/analytics/extract/route.ts), lines 10-20, parses the multipart form and copies all file bytes before extractor MIME rejection. [claudeExtract.ts](../../src/lib/claudeExtract.ts), lines 8-12 and 34-35, allows JPEG/PNG/GIF/WebP labels, but never decodes or verifies the image signature, dimensions, or frame count. The synthetic test sends 6 MiB of zero bytes labeled PNG to the mocked SDK, producing an 8 MiB base64 string. ASVS `v5.0.0-5.1.1`, `v5.0.0-5.2.1`, `v5.0.0-5.2.2`, and `v5.0.0-5.2.6`.

**Verified protection.** A missing File returns 400; a claimed unsupported MIME never calls Anthropic. Uploaded filenames are not used for storage or paths. There is no uploaded-file persistence, download endpoint, shell invocation, or local image decode in this path.

**Suspected impact:** memory pressure and wasted provider requests. Vercel request limits and Anthropic rejection may bound requests in production, but they do not establish an application file policy and were not tested. The 1 MB Server Action default does not apply to this Route Handler. Anthropic SDK defaults include a 10-minute timeout and two retries; the app does not override them. Hosting execution timeout, cancellation, and provider spend controls are unverified.

### F08. Tool schemas do not validate model output at runtime

**Verified gap.** [claudeExtract.ts](../../src/lib/claudeExtract.ts), lines 97-107, selects a tool_use block, casts its input, and maps rows. It does not verify the tool name, rows array, enum values, finite bounded accuracy, boolean fields, or row count. A mocked response with an unknown type, accuracy 999, and string `isTopPriority` returns those values. Missing/malformed rows can throw and become generic 502 errors. ASVS `v5.0.0-2.2.1`, `v5.0.0-2.2.2`, and `v5.0.0-15.3.5`.

**Verified protections.** The request forces a named tool, restricts type names in its declared schema, limits response tokens to 1024, and derives categories from deterministic rules. The screenshot is untrusted content, but the model has no filesystem, database-write, browser, or execution tool. The student reviews rows before approval, and the schedule engine is deterministic. **Suspected impact:** image text can influence extracted values or cause unusable output; prompt manipulation was not tested against the real provider. Runtime schema declarations and student review do not prove model output satisfies the server's expectations.

### F09. Approval validates values and ownership but cannot prove extraction provenance

**Verified protections.** [prepareApprovedSnapshot](../../src/lib/analyticsSnapshots.ts), lines 7-19 and 39-70, requires finite accuracy in 0-1, known source, both confirmation flags true, valid timestamps, nonempty data, extraction no older than 24 hours, and acceptable timestamp ordering. `admin_sample` requires current admin authorization. [Approval handler](../../src/app/api/analytics/route.ts), lines 12-43, uses the session's Student ID and strips a submitted foreign student ID. Existing tests reject stale/unconfirmed/empty data and stale admin sample claims. ASVS `v5.0.0-2.2.1`, `v5.0.0-2.2.2`, `v5.0.0-8.2.2`, and `v5.0.0-15.3.3`.

**Verified gaps.** Type names and priority types are arbitrary strings; timestamps/confirmation are client claims. There is no server-issued extraction receipt or binding of reviewed rows to a particular screenshot. A synthetic request creates an approved snapshot with unknown labels and fabricated fresh metadata without calling extraction. Valid requests append repeatedly with no snapshot quota/deduplication. Approved means the student confirmed supplied data; it is not evidence that the screenshot or provider produced it. **Suspected impact:** distorted own schedules, unknown-type rendering, and storage abuse. The test does not demonstrate a foreign-account write.

### F10. Ownership filters and field allowlists protect student records

**Verified protections.** Profile creation/update filters use session user ID. Zod strips extra `userId`, `role`, `$set`, and analytics fields. [Check-in action](../../src/app/dashboard/actions.ts), lines 13-35, pairs submitted schedule ID with the session-owned Student and then verifies a real activity. The evidence test for another student's schedule produces no check-in write. [History](../../src/app/progress/page.tsx), lines 26-38, resolves schedule IDs from the student's own records. ASVS `v5.0.0-8.2.2`, `v5.0.0-15.3.3`, and `v5.0.0-1.2.4`.

Repositories accept IDs without performing authorization themselves. That is safe only when every caller establishes the trusted ownership filter; they are not independent security boundaries. [students.ts](../../src/lib/students.ts), lines 15-59, projects only student fields plus owner name/email, excludes admin-owned/orphan rows, and never includes passwordHash. Admin cross-account reads are intentional.

**Verified validation gaps.** [Profile schema](../../src/lib/studentProfile.ts), line 51, accepts any nonempty goalTestDate. The test accepts `not-a-date`. Check-in schedule ID and admin student ID are not validated as Mongo ObjectIds. Numeric actualMinutes has no maximum. Mongoose may cast/reject invalid IDs downstream, but controlled HTTP error behavior was not tested. ASVS `v5.0.0-2.2.1` and `v5.0.0-16.5.1`. No arbitrary Mongo query/operator object reaches the tested credential/profile filters. This does not certify every query against injection.

### F11. Deletion scope is explicit, but atomicity and retention claims need evidence

**Verified protections.** [Deletion action](../../src/app/account/actions.ts), lines 53-69, selects only the session's Student and related schedule IDs. [deleteStudentAccount](../../src/lib/deleteStudentAccount.ts), lines 14-19, removes analytics, check-ins, schedules, Student, and User in that order. The existing synthetic repository test verifies this sequence. Admin test resets use [Mongo transactions](../../src/lib/adminTestRepositories.ts), lines 53-72, scoped to the admin workspace.

**Verified gaps.** Normal student deletion has no shared transaction, rollback, concurrent-write exclusion, or durable retry record. A failure can leave partial records; this impact is **suspected**, since database failure/concurrent deletion was not exercised. Onboarding likewise creates Student and snapshot without a transaction. Deletion requires only an existing session and `DELETE`; there is no recent-auth/password check. ASVS `v5.0.0-7.5.3` for highly sensitive actions, `v5.0.0-16.5.3`, and `v5.0.0-14.2.7`.

[Privacy copy](../../src/app/legal/privacy/page.tsx), lines 8-20, promises active-data deletion and encrypted backups expiring within 30 days. Backup encryption, expiry, restore practices, logs, provider data retention, and deletion from systems outside MongoDB are **unverified**. Lead emails are separate records and the account-deletion path does not remove them by email. This is not evidence that the account deletion code promises to delete all lead records.

[AI disclosure](../../src/app/legal/ai-disclosure/page.tsx), lines 6-9, is a placeholder. The screenshot can include incidental identifiers or metadata; the app sends the supplied bytes to Anthropic without cropping or metadata removal. The reviewed privacy copy does not describe that third-party screenshot transfer. ASVS `v5.0.0-14.1.1`, `v5.0.0-14.1.2`, `v5.0.0-14.2.3`, `v5.0.0-14.2.4`, and `v5.0.0-14.2.8`. Legal adequacy and contractual/operational retention are unverified; this is a code/data-flow observation.

### F12. Request-forgery protections differ by endpoint type

**Verified framework protections.** Auth.js checks CSRF on relevant browser auth POST paths. Its cookies default to HttpOnly and SameSite=Lax, with Secure/prefixes selected for HTTPS. Next.js Server Actions compare Origin with Host or X-Forwarded-Host and use POST. The app has no allowedOrigins override. ASVS `v5.0.0-3.3.1` through `v5.0.0-3.3.4`, `v5.0.0-3.5.1`, `v5.0.0-3.5.2`, `v5.0.0-10.1.2`, and `v5.0.0-10.2.1`.

**Verified handler gap; CSRF is suspected.** Analytics JSON approval and multipart extraction have no independent Origin/token check. Approval calls `request.json()` without requiring JSON Content-Type; a cross-origin Origin supplied to the direct approval handler still returns 201. Multipart is a browser-simple request type. SameSite=Lax normally withholds session cookies on cross-site POST, and CORS/browser cookie rules affect exploitability. The test supplies a session mock and does not prove a browser can send an authenticated cross-site request. Same-site sibling origins, actual cookie attributes, Proxy behavior, and HTTP content-type handling need deployment/browser verification.

### F13. Source minimizes private output, but production caching and headers are unknown

**Verified protections.** Admin API DTOs omit credentials, provider tokens, and raw database documents. Session callback exposes ID and role plus normal name/email/image. Private pages call auth and scope reads; no application `use cache`, `unstable_cache`, localStorage, or sessionStorage is present. The [installed Route Handler guide](../../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md), lines 49-85, says handlers are not cached by default. The global Mongoose cache stores connection state, not user data. ASVS `v5.0.0-15.3.1` and `v5.0.0-14.2.2`.

**Verified source gaps.** Private JSON handlers do not set explicit `Cache-Control: no-store`; the approval response test confirms no handler-set header. [next.config.ts](../../next.config.ts) defines only a production host redirect, with no custom CSP, HSTS, frame-ancestors, nosniff, referrer, or permissions policy. ASVS `v5.0.0-14.3.2`, `v5.0.0-3.4.1`, `v5.0.0-3.4.3`, `v5.0.0-3.4.4`, `v5.0.0-3.4.5`, and `v5.0.0-3.4.6`.

Actual Next.js/Vercel response headers, CDN/browser caches, history/back navigation, cookie caching across account switches, and TLS termination are **unverified**. No absence-of-header claim about production follows from next.config alone. Auth.js session responses explicitly use private/no-cache/no-store in installed `lib/actions/session.js`, lines 9-15. No raw HTML rendering or `dangerouslySetInnerHTML` use was found in `src`; normal React text interpolation supplies contextual escaping, but an XSS payload was not exercised in a browser. ASVS `v5.0.0-1.2.1`.

### F14. Secret values remain server-side in the reviewed code

**Verified source protections.** [db.ts](../../src/lib/db.ts), line 3, reads MONGODB_URI; the Anthropic SDK reads its credential environment variable; Auth.js resolves its own secret and Google credentials. The tracked example lists only configuration names `MONGODB_URI`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`. `.gitignore` excludes env files except `.env.example`, PEM files, `.next`, and `.vercel`. No `NEXT_PUBLIC_` credential, next.config env embedding, or direct secret return was found in the reviewed source. ASVS `v5.0.0-13.3.1` and `v5.0.0-13.3.2`.

A limited current-tracked-file scan read 172 text files and found zero high-confidence Anthropic-key, Google-secret, GitHub-token, or private-key patterns. It reported paths/line numbers only and never printed matching values. This is not a comprehensive secret detector. Local secret files were not opened; history, ignored/untracked files, built bundles, deployment environment values, key rotation, least-privilege Mongo credentials, Atlas network rules, log access, and secret-manager configuration are **unverified**. Database/SDK modules lack explicit `server-only` imports, so a future mistaken client import does not have that additional boundary; current client secret leakage was not demonstrated.

### F15. Errors have generic branches, with incomplete coverage and logging evidence

**Verified protections.** Login returns generic email/password failure, extraction returns generic provider failure, and approval turns known validation problems into 422 errors. The SDK failure test confirms that its synthetic detail does not appear in the response. [Client error boundary](../../src/app/error.tsx), lines 21-30, displays generic text. ASVS `v5.0.0-16.5.1`.

**Verified source gaps.** Multipart parsing/file buffering precedes the extraction try/catch; the malformed request test throws. Student ID casting, connection/populate failures, duplicate signup races, and unexpected snapshot persistence errors have no app-specific safe response branch. There is no structured application auth/authorization/abuse audit log. The client error boundary logs its Error, while Auth.js/SDK/operational scripts have separate default or direct logging behavior. Actual deployed error bodies, framework sanitization, log contents/redaction/access, and alerting are **unverified**. ASVS `v5.0.0-16.2.5`, `v5.0.0-16.3.1`, `v5.0.0-16.3.2`, and `v5.0.0-16.5.3`. This report does not claim stack traces or secrets are exposed to production users.

### F16. Dependency matches are verified; exploitable deployment paths are unverified

**Verified lockfile/advisory evidence.** The read-only audit found six vulnerable package entries: one critical, three high, and two moderate. The production-filtered audit found Next.js and optional sharp. See the [dependency table and official advisories](issue-70-primary-sources.md#dependency-audit) for versions, affected conditions, fixes, and tooling paths. ASVS `v5.0.0-15.1.1`, `v5.0.0-15.1.2`, and `v5.0.0-15.2.1`.

Next.js 16.3.1 matches Windows filesystem, AVIF optimizer, and ImageResponse advisories. sharp 0.35.3 matches an image-processing advisory. The screenshot path itself never calls sharp. No app next/image, ImageResponse, next/og, or YAML-parser use was found; unused framework optimizer reachability cannot be inferred from UI imports. Dev dependency matches affect brace-expansion, js-yaml, vitest, and @vitest/mocker. `vitest run` and no browser-mode configuration reduce relevance of the mock-server issue but do not erase the match.

No exploit was run. Production OS, image optimizer deployment behavior, native library versions, installed production dependency set, build artifact contents, and patch-response deadlines are **unverified**. The audit's package severity is not an application severity or proof of remote code execution. No dependency or lockfile changed.

## Focused verification and reproduction

The new tests are characterization evidence. Some intentionally assert an insecure current behavior so it is reviewable and reproducible; passing them does not mean the app meets a security requirement. A later fix must replace those assertions with the intended rejection/control. Tests use synthetic `.invalid` addresses, buffers, mocked sessions/database methods, and a mocked Anthropic SDK. They never open a database, use a real OAuth assertion, load local env values, or send provider requests.

| Evidence file | Tests | What it establishes |
| --- | --- | --- |
| [issue-70-auth.evidence.test.ts](issue-70-auth.evidence.test.ts) | 4 | Operator-object credentials rejected before DB; Google callback maps unverified synthetic profile to existing admin by email; no role/deletion refresh lookup; real bcrypt 72-byte truncation collision. |
| [issue-70-boundaries.evidence.test.ts](issue-70-boundaries.evidence.test.ts) | 15 | Two unauthorized roster cases; stale role reads vs guarded mutation; missing handler extraction auth; 6 MiB buffering/signature gap; unsupported MIME and generic SDK error protection; multipart error escape; unchecked tool output; approval auth/ownership; fabricated provenance/unknown labels; missing Origin/no-store controls; cross-owner schedule denial; profile field stripping/non-date acceptance. |
| Existing [analytics route tests](../../src/app/api/analytics/route.test.ts) | 14 | Confirmation, freshness, sample source authorization, own-account scope, and admin-clock behavior. |
| Existing [admin action tests](../../src/app/admin/test/actions.test.ts) and [workspace tests](../../src/lib/adminTestWorkspace.test.ts) | 10 + 17 | Reject non-admin/stale admin before mutations; workspace date/reset boundaries. |
| Existing [account](../../src/app/account/actions.test.ts), [onboarding](../../src/app/onboarding/actions.test.ts), [check-in](../../src/app/dashboard/actions.test.ts), [student DTO](../../src/lib/students.test.ts), and [deletion](../../src/lib/deleteStudentAccount.test.ts) tests | 6 + 4 + 3 + 5 + 1 | Profile allowlists and bounds, session ownership, read serialization, deletion order. |
| Existing [read-only schedule tests](../../src/lib/readOnlyCurrentWeekSchedule.test.ts) | 3 | Admin read boundary has no schedule creation/write behavior. |

Commands run locally:

```sh
npm test -- docs/security/issue-70-auth.evidence.test.ts docs/security/issue-70-boundaries.evidence.test.ts
npm test
npx tsc --noEmit --incremental false
npx eslint docs/security/*.test.ts
npm audit --json --ignore-scripts
npm audit --omit=dev --json --ignore-scripts
```

Results: 19 new evidence cases passed. Full suite passed all 416 tests in 49 files. TypeScript and focused ESLint passed. Both audit commands exited 1 because of advisory matches, not a failed audit request. No production build/dev server was started, since those can load local credentials or execute server reads; production HTTP behavior remains outside the verified scope.

## Evidence still needed for decisions

These checks remain open, not silently passed:

1. Real cookie/session lifecycle after demotion, account deletion, logout, and account switching, including another browser. Check expiry renewal and revocation expectations.
2. Google subject/linking policy and a controlled synthetic OAuth-account test. Confirm email verification and pre-registration behavior without using another person's identity.
3. Actual private-page/API response headers, CDN/browser cache behavior, CSP/framing policy, TLS, and proxy/forwarded-host handling in an authorized test deployment.
4. Browser request-forgery tests for JSON, alternate content types, multipart, and same-site sibling origins; verify deployed session cookie attributes.
5. Deployment abuse controls, upload/request/concurrency limits, provider spend/timeouts, and advisory input reachability. Use bounded synthetic requests in a test environment.
6. Atlas least privilege/network restrictions, index deployment, backups/encryption/expiry, restore/deletion practice, logs/redaction/access/alerts, and Anthropic contractual/configured retention.
7. Deletion/onboarding failure and concurrency behavior against a disposable database. Verify all related records and identify any orphan/retry behavior.
8. Deployed dependency/native library inventory, supported upgrade set, and the project's remediation-time policy. Lockfile matches alone do not settle these questions.

The local evidence collection is complete for the stated scope. Choosing fixes, production verification, issue closure, and launch readiness are subsequent decisions.
