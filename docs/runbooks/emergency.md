# Emergency guide

Steps for abuse, a leaked key, or spend near the limit. Stage 5 ([issue 251](https://github.com/Jahazel/lsat-scheduler/issues/251))
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
