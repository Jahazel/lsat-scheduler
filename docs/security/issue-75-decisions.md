# Abuse and extraction rules

Decisions for [issue 75](https://github.com/Jahazel/lsat-scheduler/issues/75), under [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Decided by the owner on October 2, 2026, America/Chicago, against checkout `26ef710`.

**Update, October 23, 2026:** The owner replaced some rules after the practice-test result made a weekly upload send up to 6 screenshots ([issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245)). Rule 29 is now 10 in 1 day and 40 in 1 month. Rules 39 to 41 count $0.02 for an analytics extraction and $0.03 for a practice-test section extraction. Rule 49 now adds a warning at 80% of the app limit. Rule 52 now lets a practice-test week skip the practice-test result while extraction is off. The password parts of rules 8 to 10 and 12 to 16 wait for the password sign-in issue ([issue 230](https://github.com/Jahazel/lsat-scheduler/issues/230)) and must pass before password sign-in returns. Each replaced rule below keeps its original text and names its replacement.

**Status: decided.** These are rules for later work. None of them is built yet. The checks in [release-gate.md](release-gate.md#c-abuse-limits-and-spending) still fail until the code passes them.

The evidence comes from issue 70 findings F05, F07, F08, and F09. The $10 monthly extraction limit and the manual entry fallback come from [issue 72](issue-72-decisions.md). The signup, verification, and reset flows that these limits protect come from [issue 74](issue-74-decisions.md).

## Words in this file

- **Extraction** means one call to Anthropic that reads one screenshot. It costs money.
- **Limit** means the largest number of times a person can do an action in a time window.
- **Counter** means the number that the app keeps to apply a limit.
- **Day** and **month** use the America/Chicago calendar. A day starts at midnight. A month starts at midnight on the 1st.
- **Real clock** means the actual time. It is never an admin's simulated date.

## What the app does today

- No limit exists on signup, login, lead capture, analytics snapshot saves, or extraction (F05).
- Lead capture saves the same email again and again. The Lead model has no unique index (F05).
- The extraction handler reads the whole upload into memory. It checks only the file type that the browser claims. GIF is allowed (F07).
- The Anthropic SDK uses its defaults: two retries and a 10-minute timeout. The app does not read token usage (F07, issue 72).
- Nothing stops many extractions at the same time, from one student or from all students.
- No switch turns extraction off. The only stop is the Anthropic spend limit, now $20.
- A student cannot make an analytics snapshot without a successful extraction. The review screen stays hidden until extraction succeeds (issue 72).
- Approval accepts any type name. The `source` field is a claim from the browser (F09).

## Decisions

### Counters

1. Every counter is kept in the main database. Counters in server memory are not allowed, because Vercel runs more than one server instance.
2. Each counter update is atomic. Two requests at the same time cannot both read the same old count.
3. Each limit uses a fixed time window. Old counters are deleted automatically.
4. All limit code is in one module with one job: count an action and say whether the limit is reached. No other code reads or writes counters.

**Why:** DrillMap expects fewer than 50 students, so the existing database is fast enough. A Redis service would add a provider, a key, and a bill. If [#78](https://github.com/Jahazel/lsat-scheduler/issues/78) moves DrillMap to another database, only the module in rule 4 changes. The checks test behavior, not the database.

### Refusals

5. A refused request gets HTTP 429 with a `Retry-After` header and a short message that says when to try again. A form shows the message on the form. **Update, October 24, 2026:** A Next.js form action cannot set a status code or a header, so a refused form action replies with the message only and saves nothing. HTTP 429 with `Retry-After` applies to the scan routes ([issue 249](https://github.com/Jahazel/lsat-scheduler/issues/249)).
6. Each refusal happens before bcrypt, email, a database write, or an Anthropic call.
7. Every limit uses the real clock.

### Signup

8. One email can get 3 signup emails in 1 hour and 5 in 1 day. One IP address can make 10 signups in 1 hour.
9. Over a limit, the screen still says "Check your email," as issue 74 rule 9 requires. No email goes out and nothing is saved.
10. Verification email resends use the same limits and share the same counters as signup.
11. Google signup has no app limit. Google handles bots.

### Login

12. One email can have 10 failed logins in 15 minutes. One IP address can have 50 failed logins in 1 hour.
13. Over a limit, login is refused until the window ends. There is no permanent lockout.
14. The app counts failed logins for unknown emails too. The refusal message is the same for every email. No bcrypt check runs on a refused login.

**Why:** A permanent lockout lets an attacker lock a real student out. Counting unknown emails means the limit cannot show whether an Account exists.

### Password reset

15. One email can ask for 3 resets in 1 hour. One IP address can ask for 10 resets in 1 hour.
16. Over a limit, the reset screen still shows the same message, as issue 74 rule 17 requires. No email goes out.

### Lead capture

17. The Lead collection stores each email one time, with a unique index.
18. A repeat email gets the normal success message and writes nothing.
19. One IP address can submit lead capture 5 times in 1 hour.

### Analytics snapshot saves

20. One student can save 5 analytics snapshots in 1 day. The limit is the same for every source.
21. Admins have the same limit on their student side.

### Upload files

22. The app accepts PNG, JPEG, and WebP. GIF is removed.
23. The server finds the type from the file's first bytes. It does not trust the type that the browser sends.
24. A file is at most 4 MB. The request body is at most 4.5 MB, which is Vercel's limit for a function request.
25. Each side is at most 8,000 px, and the image is at most 25 megapixels. The server reads the size from the file header before it decodes the image.
26. The image has one frame. The server refuses animated PNG and animated WebP.
27. Before upload, the browser shrinks the image until its longer side is at most 1,568 px. The server still applies rules 22 to 26.
28. The server refuses a bad file before it reads the whole file and before it calls Anthropic. **Clarified by the owner on 2026-10-24 ([issue 248](https://github.com/Jahazel/lsat-scheduler/issues/248)):** the server refuses a request over 4.5 MB before it reads the whole request. It checks the file after that bounded read, before any Anthropic call. A broken image means a cut-off or badly built file. A well-built file with corrupt picture data is not decoded on the server; Anthropic refuses it, and the student sees "Couldn't read that screenshot."

**Why:** Anthropic shrinks any image with a longer side over 1,568 px, so a larger image does not help the model ([vision documentation](https://platform.claude.com/docs/en/build-with-claude/vision)). Shrinking in the browser keeps phone and Retina screenshots under 4 MB. It also caps the image cost of each extraction.

### Extraction limit for each student

29. One student can have 5 extractions in 1 day and 20 in 1 month. **Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 1:** 10 extractions in 1 day and 40 in 1 month. One practice-test week needs 6, and a month needs about 27.
30. An extraction counts when a file passes rules 22 to 28 and the app calls Anthropic.
31. Admins have the same limits.
32. There is no extraction limit for each IP address. Email verification (issue 74) slows new Accounts, and the $10 monthly limit caps the total.

**Why:** A student saves about one analytics snapshot each week. 5 each day and 20 each month cover that plus a few bad screenshots.

### Retries and timeout

33. The app does not retry automatically. The SDK setting `maxRetries` is 0.
34. An extraction waits at most 30 seconds for Anthropic.
35. After a failure, the student sees "Try again." Each try is a new extraction and counts toward rule 29.

**Why:** One press then starts one paid call at most. A normal extraction takes a few seconds.

### Extractions at the same time

36. One student can have 1 extraction running. A second request is refused with "We're still reading your last screenshot."
37. The whole site can have 5 extractions running.
38. A running extraction holds its place for at most 2 minutes. After that the place is free again, even if the server stopped.

**Why:** Without rule 37, many extractions that start together can all pass the $10 check in rule 41 before any of them is counted.

### Counting the $10 monthly limit

39. Before each extraction, the app counts $0.02. **Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 2:** $0.02 for an analytics extraction and $0.03 for a practice-test section extraction.
40. When Anthropic replies, the app replaces the $0.02 with the real cost from the reply's token usage and the current price. With no reply, such as a timeout or an error, the $0.02 stays. **Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 2:** the count for the extraction type ($0.02 or $0.03) is replaced or stays.
41. Before each extraction, the app adds $0.02 to the month's total. If the result is more than the limit, no extraction starts. The total never goes over the limit. **Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 2:** the app adds the count for the extraction type ($0.02 or $0.03).
42. The total goes back to $0 at the start of each month.
43. All extractions on the real site count. This includes admin extractions and failed extractions.
44. Sample analytics snapshots and hand-typed analytics snapshots do not count. They make no Anthropic call.
45. Extractions on the copy of the site do not count. The copy uses its own Anthropic workspace with a $5 limit.
46. The limit is a database setting, $10 at launch. The owner changes it with one command. The change works on the next extraction, with no new release.
47. If the owner sets the limit above $20, the owner must also raise the Anthropic monthly spend limit. Otherwise Anthropic stops all extractions first.
48. When the limit is reached, students see "Scanning is off right now. Enter your analytics by hand."
49. No new warning is added. Anthropic's emails at $5 and $8 and the release gate's "App extraction limit reached" alert stay. **Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 3:** when the month's total reaches 80% of the limit ($8 of $10), the owner gets an email through Healthchecks.io. The "App extraction limit reached" alert stays.

**Why:** After rule 27, one extraction costs at most about $0.008. That is about 1,600 image tokens, about 1,200 tokens of text and tool schema, and 1,024 output tokens at Haiku 4.5 prices ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)). The $0.02 is more than twice that, so the app's total is never below the real spend. Review the $0.02 when the model, the price, or the image rules change. A practice-test section extraction allows 4,096 output tokens, so its worst case is about $0.024. [Issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245) counts $0.03 for it.

### Emergency switch

50. A database setting turns extraction off. The owner sets it with one command.
51. The app reads the setting before each extraction. The change works on the next extraction.
52. When extraction is off, no Anthropic call starts. Students see the message in rule 48. Hand-typed analytics snapshots, this week, and progress still work. **Added by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245), decision 4:** when extraction is off or the limit is reached, a student in a practice-test week can confirm the weekly upload without the practice-test result. The next weekly schedule then has no "missed type goes first" for that week. It does not reuse an older practice-test result.
53. The emergency guide in `docs/runbooks/` lists the commands for rules 46 and 50. Revoking the Anthropic key stays the last step.
54. An admin page control can come later, when the other admin gets permission to pause the site.

**Why:** A Vercel environment variable needs a new deploy to change. A database setting works at once and needs no new UI.

### Hand-typed analytics snapshots

55. A student can always type their analytics by hand. The option is next to the screenshot upload. It does not wait for a failed extraction.
56. A hand-typed analytics snapshot records the source `manual_entry`.
57. The app does not prove where an analytics snapshot came from. There is no server-signed extraction receipt. The source is a label from the student.
58. Every source gets the same approval checks: known type names only, accuracy from 0 to 1, top-priority types from the Stimulus Logic list only, and at most one row for each type. Rule 20 applies too.
59. The 24-hour freshness rule applies to `7sage_screenshot` and `admin_sample` only. For `manual_entry`, the student still confirms that the values are their latest analytics.
60. `admin_sample` stays admin-only.
61. A student with a hand-typed analytics snapshot can get a weekly schedule.

**Why:** A student can already type any values, so a receipt would prove nothing that matters. Equal checks for every source give the same protection with less work.

## Checks

The [launch checklist](release-gate.md#c-abuse-limits-and-spending) holds the full text of each check. This table shows which rules each check tests.

| Check | Rules |
| --- | --- |
| C1 | 5 to 21 |
| C2 | 1 to 4, 36 to 38 |
| C3 | 29 to 31 |
| C4 | 33, 34, 39 to 47, 49 |
| C5 | 48, 50 to 53 |
| C6 | 55 to 61 |
| [D2](release-gate.md#d-screenshots-and-model-output) | 22 to 28 |

## Not decided here

- Which refusals and abuse events go in logs, and how long lead emails are kept, belong to the browser and data ticket ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)).
- The database choice belongs to the database research ticket ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)). Rule 4 keeps these limits independent of it.
- Model output checks are check D3 and need no policy ticket.

## Decisions recorded

The owner made each decision in the issue 75 discussion.

| Topic | Answer |
| --- | --- |
| Where counters live | The main database, behind one module. They move if the database changes. |
| Signup limits | As in rules 8 to 11. |
| Login and reset limits | As in rules 12 to 16. |
| Lead capture | One record for each email, and 5 submissions in 1 hour for each IP address. |
| Analytics snapshot saves | 5 in 1 day for each student. |
| Upload files | As in rules 22 to 28. |
| Extraction limit for each student | 5 in 1 day and 20 in 1 month. Admins have the same limit. Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245): 10 in 1 day and 40 in 1 month. |
| Retries | None automatic. A 30-second timeout. |
| Extractions at the same time | 1 for each student and 5 for the site, with a 2-minute expiry. |
| Emergency switch | A database setting, changed with one command. |
| Hand-typed analytics snapshots | Always available. Source `manual_entry`, not proven. The same checks for every source. |
| Refusals | HTTP 429 with `Retry-After`, before any costly work. |
| Counting the $10 | $0.02 before each extraction, replaced by the real cost. Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245): $0.02 for an analytics extraction, $0.03 for a practice-test section extraction. |
| When extraction stops | Before the total would go over the limit. |
| Month start | Midnight on the 1st, America/Chicago. |
| What counts | All real-site extractions, including admin and failed ones. |
| Changing the limit | A database setting, changed with one command. |
| Warnings | No new ones. Replaced by [issue 245](https://github.com/Jahazel/lsat-scheduler/issues/245): a warning at 80% of the app limit. |
