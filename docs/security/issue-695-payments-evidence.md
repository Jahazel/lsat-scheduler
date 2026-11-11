# Payments checks evidence

Record for [#695](https://github.com/Jahazel/lsat-scheduler/issues/695), under the payments spec [#680](https://github.com/Jahazel/lsat-scheduler/issues/680). It covers the [J. Payments](release-gate.md#j-payments) rows of the launch checklist.
This file holds no key, secret, connection string, cookie, card number, or test email address. Test Accounts are named pay1 to pay5.
It approves no release or launch.

## Version and dates

| Item | Value |
| --- | --- |
| Version under test | `59f1003` (`59f1003f775f243b12b44eedba7514f291527047`), `main` on 2026-11-11 |
| Copy of the site | Deployment of `59f1003` finished before the owner run. Stripe sandbox, webhook endpoint API version `2025-03-31.basil`. |
| Code tests | 2026-11-11, on `59f1003`, Node 24 |
| Owner run on the copy | 2026-11-11, 21:10 to 21:37 UTC. The owner drove the browser, the Neon SQL editor, and the Stripe Dashboard with a wizard. The wizard read Stripe with the sandbox key and recorded each result. |
| Earlier copy run | 2026-11-11, 20:15 to 20:45 UTC, on `1a73e49` ([#695 comment](https://github.com/Jahazel/lsat-scheduler/issues/695)). No payment file changed between `1a73e49` and `59f1003`. |

Test clocks do not work with the app: the app's customer lookup skips customers on a test clock, and plan status uses real time. Where a J row says "test clock", the run used `trial_end=now`, `billing_cycle_anchor=now`, or a test-only database edit instead, and Stripe's own record of each subscription and invoice.

## Code tests

| Suite | Result |
| --- | --- |
| `npm test` | 126 files, 1779 tests passed |
| `npm run test:postgres` (local Postgres) | 40 files, 631 tests passed |
| `npm run check-stripe-prices` with the copy's sandbox settings | `{"ok":true,"status":"match","mode":"test"}` |

The tests that each row relies on:

| Row | Tests |
| --- | --- |
| J1 | `tests/postgres/stripeMessages.test.ts` "refuses a forged, changed, or stale message…" (no header, empty, junk, other site's secret, changed body, 301 s old, wrong scheme); `src/lib/requestPolicy.test.ts` "exempts only the Auth.js routes, the daily cleanup cron route, and the Stripe message receiver" (exact path only) |
| J2 | Code search on `59f1003`: no card field, `autocomplete="cc-…"`, or Stripe card element script in `src/`. `billing_records` holds only Stripe IDs, plan, status, dates, two flags, and a cancel reason (`src/lib/postgresSchema.ts`). |
| J3 | `src/lib/stripeMessages.test.ts` "finds no writer of billing records but the Stripe message receiver…"; `tests/postgres/planChoice.test.ts` "shows Starting your plan after Checkout until Stripe confirms, and changes no billing state on the way back"; `tests/postgres/billingResync.test.ts` |
| J4 | `tests/postgres/stripeMessages.test.ts`: repeated message, two copies at the same time, reverse order, newest state while a read is in flight, saves Stripe's subscription not the message; `tests/postgres/dailyCleanup.test.ts` prunes handled Stripe messages |
| J5 | `tests/postgres/planChoice.test.ts`: two clicks leave one open Checkout session; no second Checkout while a plan's message is on its way; refuses an admin, no session, and an Account without onboarding; `tests/postgres/customerPortal.test.ts`; `tests/postgres/stripeMessages.test.ts`: other Stripe customer, deleted Account |
| J6 | `tests/postgres/stripeMessages.test.ts` "ignores a message for an admin Account and logs it", "waits for a role change in progress…"; `tests/postgres/planEnd.test.ts` "making an Account with a plan an admin cancels its subscription at once"; `tests/postgres/weeklyUpload.test.ts` "judges the plan by the real time, not a simulated date"; `src/lib/planStatus.test.ts` |
| J9 | `tests/postgres/weeklyUpload.test.ts` "hides a held weekly schedule and refuses its check-offs until the first charge succeeds", "keeps a held weekly schedule out of Progress after a failed first charge…"; `tests/postgres/admin.test.ts` held weekly schedule |
| J10 | `src/app/api/analytics/extract/route.test.ts` and `src/app/api/practice-test/extract/route.test.ts` refuse lapsed and no-plan students before any scan; `src/lib/planStatus.test.ts` "allows the weekly upload in the free week, paid, retrying, and admin…" |
| J11 | `tests/postgres/planChoice.test.ts` "starts Checkout with no free week for an email in the used free week list"; `tests/postgres/stripeMessages.test.ts` used free week rows; `tests/postgres/dailyCleanup.test.ts` |
| J12 | `tests/postgres/planEnd.test.ts`: cancel before removal, Stripe failure stops the deletion and the daily job finishes it, no second cancel |
| J14 | `tests/postgres/stripeMessages.test.ts` "answers 500 when Stripe fails, saving nothing, so Stripe sends it again"; `src/lib/securityLog.test.ts` |

## Owner run results

| Time (UTC) | Row | Result | What was checked |
| --- | --- | --- | --- |
| 21:10 | — | Pass | The copy's deployment of `59f1003` had finished. |
| 21:10 | J1 | Pass | Five messages to `/api/stripe/webhook`: no signature, junk signature, signed with another secret, body changed after signing, signature 6 minutes old. Each got HTTP 400. |
| 21:11 | J1 | Pass | `security_log` held exactly 5 `badSignature` rows for the receiver in that window. |
| 21:12 | J2, J14 | Pass | A search of every table on the copy's database found no test card number, no Stripe secret or signature, and no email in `security_log`. |
| 21:16 | J3 | Pass | pay5 opened the Checkout return address with a made-up session ID, then with pay1's real session ID. pay5 got no plan and no Stripe subscription. pay1's subscription did not change. |
| 21:18 | J5 | Pass | pay5 double-clicked "Add card on Stripe" and paid with test card 4242. Stripe holds one customer and one subscription for pay5, in the free week. |
| 21:23 | J4 | Pass | The `checkout.session.completed` message for pay5 was sent again twice with the Stripe CLI. A fingerprint of pay5's billing record was the same before and after. |
| 21:23 | J12 | Pass | pay5 deleted the Account. Stripe shows the subscription cancelled and no invoice with money paid or due. |
| 21:26 | J12 | Pass | The same message was sent once more, for the deleted Account. The copy saved no billing record for pay5's Stripe customer. |
| 21:26 | J7 | Pass | The copy's Stripe sandbox secret key was rotated. Stripe refuses the old key and accepts the new one. The new key is on the copy and on the owner's computer; the copy was redeployed. |
| 21:31 | J11 | Pass | pay5 signed up again with the same email. Plan choice said "This email already had a free week" and "$10 today". Stripe Checkout opened with $10.00 due today and no trial, so the copy works with the new key. pay5 did not pay and was deleted again. |
| 21:31 | J10 | Pass | pay5, with no plan, opened the weekly upload page and was sent back to onboarding. |
| 21:36 | J2, J14 | Pass | The copy's Vercel logs from 14:35 to 15:36 US Central (the Hobby plan's one hour) had no match for `sk_test`, `whsec_`, `v1=`, `stripe-signature`, `4242`, or `@gmail`. The window held two `/login` errors from pay5's sign-in at 15:13; neither held an email or a payment field. |
| 21:36 | J15 | Pass | Stripe sign-in uses an authenticator app. Text-message codes are not on. Recovery codes are in the password manager and on one printed copy. The owner is the only team member. |

## Other evidence used

- **J7 copy settings:** the 7 subscriptions that the copy made all use the sandbox price IDs that the price check read, and none is in live mode. The copy's Stripe endpoint sends exactly the 13 message types in `src/lib/stripeMessages.ts`. No live Stripe key (`sk_live_`, `rk_live_`) is in the project folders, the shell files, or the shell history on the owner's computer.
- **J9, J10, J11 lapsed cases:** the earlier copy run on 2026-11-11 (pay2): a failing first charge lapsed the student at once, This week and the Plan card showed the lapsed state, and the next plan choice offered no free week.
- **J15 settings:** recorded on [#683](https://github.com/Jahazel/lsat-scheduler/issues/683) on 2026-11-10: Managed Payments works with a free trial, receipt and failed-payment emails, the trial reminder, Smart Retries ending within 1 week, and the Customer Portal settings with owner decision B.

## Still open

| Row | What is missing |
| --- | --- |
| J7 | The emergency guide has no rotation steps for the Stripe key or the message secret ([#831](https://github.com/Jahazel/lsat-scheduler/issues/831)). The real site's restricted key, the hash comparison (H4), and the rotation drill (H5) wait for the real-site release. |
| J8 | The run against the real site's live prices, before the release. |
| J9 | pay1's held weekly schedule: saved Nov 20–22 and hidden, shown after the first charge on Nov 23. |
| J11 | A Checkout after the H5 rotation of `AUTH_SECRET`, which keys the used free week list. |
| J13 | Needs a backup restore on the copy; it runs with the restore drill (F4, I2). |
| J14 | The Vercel log search covered this run only. The failed-charge, renewal-failure, and cancel paths ran on the earlier run, whose logs had expired. Search again after the Nov 18–23 real-time checks. |
| J15 | The cancellation email, checked on Nov 23 (pay4). |
| J16 | Needs the real site. |
