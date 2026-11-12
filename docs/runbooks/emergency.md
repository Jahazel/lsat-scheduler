# Emergency guide

Steps for abuse, a leaked key, spend near the limit, or a lost database. Stage 5 ([issue 251](https://github.com/Jahazel/lsat-scheduler/issues/251))
adds the scanning switch and the monthly money limit. Stage 7 adds the other steps listed in the
[launch checklist](../security/release-gate.md#owner-and-alerts).

## Words in this file

- **Scan**: one paid Anthropic call that reads one screenshot.
- **Emergency switch**: the `scanning_off` setting. When it is `true`, no scan starts.
- **Monthly limit**: the `monthly_limit_usd` setting. The month's money total never goes over it.
- **Month's total**: the `total_usd` value for the current month in `scan_spending`. Each scan adds $0.02
  (analytics) or $0.03 (practice-test section) before its call. A reply replaces that amount with the real cost.
  A month starts at midnight on the 1st, America/Chicago. The app keeps this month and last month and deletes older months.

Students who are refused see "Scanning is off right now. Enter your analytics by hand."

## Where to run the commands

Run each command in Neon's browser SQL Editor as the Neon owner, on the right branch: the copy or production.
The app's database login can read these settings but cannot change them. A change works on the next scan,
with no release.

## Turn scanning off

```sql
UPDATE scan_settings SET scanning_off = true;
```

Turn it back on:

```sql
UPDATE scan_settings SET scanning_off = false;
```

## Change the monthly limit

```sql
UPDATE scan_settings SET monthly_limit_usd = 15;
```

The limit starts at $10. If you set it above $20, also raise the Anthropic monthly spend limit in the
Anthropic Console. Otherwise Anthropic stops all scans first.

## Read the current state

```sql
SELECT scanning_off, monthly_limit_usd FROM scan_settings;
SELECT month_start, total_usd, warning_sent_at, limit_alert_sent_at FROM scan_spending;
```

## Spend alerts

The app sends a fail signal to a Healthchecks.io check in two cases, at most once each month:

| Alert | When | Server setting |
| --- | --- | --- |
| App spend at 80% of the limit | A scan's count moves the month's total to 80% of the limit or more. | `SCAN_SPEND_WARNING_PING_URL` |
| App extraction limit reached | A scan is refused because its count would put the total over the limit. | `SCAN_LIMIT_REACHED_PING_URL` |

Set up each check once for the copy and once for the real site, four checks in total. Put each ping URL in
the Vercel server settings for its own environment. Never share a URL between the copy and the real site.
A missing URL is logged as `spend_alert_not_configured` and does not stop the scan. A missing URL or a failed send leaves the alert unsent, so the next scan that meets the condition tries again.

The checks must alert only on a fail signal, never on silence:

1. Create the check in Healthchecks.io and connect your email.
2. Pause the check. A paused check sends no alert when no ping arrives.
3. When a fail signal arrives, the check leaves the paused state, goes down, and emails you.
4. After you act on the alert, pause the check again so the next month's signal alerts.

Do not turn on "Ignore the ping, stay in the paused state". It hides the fail signal.

## Restore the database from a backup

Follow the [restore runbook](restore.md) step by step. Restore into a new branch. Before the site uses
that branch:

1. Run `npm run check-backup-ages` with the current branch's ID as `BACKUP_BRANCH_ID`. It must not
   name the restored branch. If it names only other copies, go on and remove them afterwards.
2. Run `npm run replay-deletions` on the restored branch, with the current branch's deletion list. Run it
   twice. The second run must print `Restored Accounts deleted: 0.`
3. Then run `npm run resync-billing` on the restored branch with a Stripe key and the site's
   `AUTH_SECRET`. The copy uses its sandbox key. The real site uses a one-run restricted key that you create
   for the restore and delete after it; the [restore runbook](restore.md) says how. Run it twice. Both
   runs must print the same counts and end with `Billing records Stripe does not list: 0.`

Only then change the site's `DATABASE_URL`. The replay refuses production hosts. On the real site, do not
let the site use a restored branch until the owner decides how to run the replay there. Afterwards, remove the former branch, every `_old_` branch,
unused restore branches, and every expired snapshot, each with the owner's approval.

## Rotate the Stripe credentials

Rotate the Stripe secret key and the Stripe message secret after a leak, and in the yearly rotation drill
(H5 in the [launch checklist](../security/release-gate.md)). Each site has its own pair:

| Site | Stripe mode | `STRIPE_SECRET_KEY` | `STRIPE_WEBHOOK_SECRET` |
| --- | --- | --- | --- |
| Copy | Sandbox (test mode) | Test secret key (`sk_test_`). Your computer's `.env.local` holds the same key (J7). | The copy's endpoint signing secret |
| Real site | Live mode | Restricted live key (`rk_live_`) | The real site's endpoint signing secret |

The real site also has a price-check key: a restricted live key whose only permission is Prices: Read. The
release check in J8 uses it. It lives only in the password manager.

Never place a live key or the real site's message secret on your computer, not even the old one. J7 allows
two exceptions. Each is entered with `read -rs`, set in the shell for one run, and saved in no file:

- the price-check key, for the J8 release check;
- a one-run restore key, which the [restore runbook](restore.md) creates for a real-site billing resync
  and deletes right after. It needs no rotation.

Never print a key or a secret, and never paste one into an issue or a chat. Record only the date of each
rotation.

### Rotate the Stripe secret key

1. Copy only: before you rotate, open Developers → API keys in the sandbox, reveal the current secret key, and
   enter it in the shell, so it stays out of shell history. Stripe must answer `200`, which proves the shell
   holds the working old key. Keep this terminal open until step 11; the check there needs the key.

   ```sh
   read -rs OLD_STRIPE_KEY && export OLD_STRIPE_KEY
   node -e 'fetch("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${process.env.OLD_STRIPE_KEY}` } }).then((response) => console.log(response.status))'
   ```

2. In the Stripe Dashboard, switch to the site's mode: the sandbox for the copy, live mode for the real site.
3. Open Developers → API keys. Find the secret key (copy) or the site's restricted key (real site), and choose
   Rotate key.
4. Choose when the old key expires. After a leak, choose Now: Checkout fails until step 7 is done. In the
   drill, choose a short overlap, such as 1 hour.
5. Copy the new key once from the Stripe dialog. Do not save it in a file.
6. In Vercel, open the site's project → Settings → Environment Variables. Replace `STRIPE_SECRET_KEY` for
   Production, marked Sensitive.
7. Redeploy the latest production deployment so it reads the new key.
8. Copy only: replace the sandbox key in `.env.local` with the new test key. Your computer shares the
   copy's key (J7), so the old key now fails there too.
9. Run the checks below that the site works with the new key.
10. If you chose an overlap, return to Developers → API keys and make the old key expire now.
11. Run the checks below that Stripe refuses the old key.

**Check that the site works with the new key:**

1. Sign in on the site with a test Account and choose a plan on the plan choice screen. Stripe Checkout
   opens. On the real site, close Checkout without paying.
2. In Stripe, Developers → Webhooks → the site's endpoint shows no failed deliveries since the rotation.

**Check that Stripe refuses the old key:**

- Copy: run this in the terminal from step 1. Stripe must answer `401`. If the shell no longer holds the
  old key, the command stops with an error and tests nothing. Then rotate the key again from step 1.

  ```sh
  : "${OLD_STRIPE_KEY:?enter the old key from step 1}" &&
    node -e 'fetch("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${process.env.OLD_STRIPE_KEY}` } }).then((response) => console.log(response.status))'
  unset OLD_STRIPE_KEY
  ```

- Real site: in Developers → API keys, the old restricted key is listed as expired or is gone. Do not test
  it from your computer.

### Rotate the price-check key

1. In the Stripe Dashboard, switch to live mode and open Developers → API keys.
2. Find the restricted key whose only permission is Prices: Read, and choose Rotate key. Choose Now: only the
   release check uses this key.
3. Copy the new key once from the Stripe dialog. Replace the old key in the password manager. Do not save it
   in a file.
4. Check that the new key works: run `npm run check-stripe-prices` with the real site's settings, as J8
   describes. It must pass and print that it read live mode. Then `unset STRIPE_SECRET_KEY`.
5. Check that Stripe refuses the old key: in Developers → API keys, the old key is listed as expired or is
   gone. Do not test it from your computer.

### Rotate the Stripe message secret

1. Copy only: before you roll, open the copy's endpoint in the sandbox (Developers → Webhooks), reveal the
   current signing secret, and enter it in the shell, so it stays out of shell history. The check below
   needs it.

   ```sh
   read -rs OLD_WEBHOOK_SECRET && export OLD_WEBHOOK_SECRET
   ```

2. In the Stripe Dashboard, switch to the site's mode.
3. Open Developers → Webhooks, then the site's endpoint (its URL ends in `/api/stripe/webhook`). Choose Roll
   signing secret.
4. Choose when the old secret expires. After a leak, choose Now: messages fail until step 7 is done, and
   Stripe retries them for up to 3 days. In the drill, choose a short overlap, such as 1 hour. During the
   overlap, Stripe signs each message with both secrets.
5. Reveal the new signing secret (`whsec_`) and copy it once. Do not save it in a file.
6. In Vercel, replace `STRIPE_WEBHOOK_SECRET` for Production, marked Sensitive.
7. Redeploy the latest production deployment before the old secret expires. The site now holds only the new
   secret, so it refuses the old one at once.

**Check that the site refuses the old secret:**

1. On each site, send a message with no signature. The site must answer `400`.

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -d '{}' \
     https://SITE/api/stripe/webhook
   ```

2. Copy only: send a message signed with the old test secret from step 1. The site must answer `400`.

   ```sh
   node -e '
   const { createHmac } = require("crypto");
   const body = JSON.stringify({ id: "evt_rotation_check", type: "customer.subscription.updated" });
   const t = Math.floor(Date.now() / 1000);
   const v1 = createHmac("sha256", process.env.OLD_WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex");
   fetch(process.argv[1] + "/api/stripe/webhook", {
     method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` }, body,
   }).then((response) => console.log(response.status));
   ' https://COPY-SITE
   unset OLD_WEBHOOK_SECRET
   ```

3. Real site: on the endpoint's page in Stripe, the old secret is expired. Do not test it from your computer.

**Check that the site handles messages with the new secret:**

1. Copy: start and finish a test Checkout with a Stripe test card, so Stripe sends messages. Real site: wait
   for the next real message.
2. On the endpoint's page in Stripe, the next message after the redeploy was delivered with HTTP 200, and
   no delivery has failed since the rotation.
3. Copy: the test Account's plan in DrillMap shows the new subscription.
