# Account security rules

Decisions for [issue 74](https://github.com/Jahazel/lsat-scheduler/issues/74), under [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Decided by the owner on October 1 and 2, 2026, America/Chicago, against checkout `c81aa18`.

**Status: decided.** These are rules for later work. None of them is built yet. The checks in [release-gate.md](release-gate.md#b-sign-in-and-accounts) still fail until the code passes them.

The evidence comes from [issue 70](issue-70-evidence.md) findings F01 to F04 and the Google client settings in [issue 71](issue-71-evidence.md#google-oauth-and-google-cloud). The protection categories come from [issue 72](issue-72-decisions.md).

## What the app does today

- Google sign-in finds the Account by email. It stores no Google ID and does not read `email_verified` (F03).
- A Google sign-in with the email of a password Account opens that Account (F03).
- Password signup does not verify the email. Signup says when an email already exists (F03, F04).
- bcrypt reads only the first 72 bytes of a password. Signup requires letters and digits and has no common-password check (F04).
- No password reset, password change, or email verification exists. The app cannot send email.
- Sessions are JWTs that roll forward for 30 days. No request checks the database for deletion, role, or a disabled state (F01, F02). No disabled state exists.
- The Google sign-in client is External and in Testing. Its home, privacy, and terms links are empty (issue 71).

## Decisions

### Email

1. DrillMap adds a transactional email provider with a verified sending domain. The exact provider is chosen when the work is built. Its key and domain records fall under the infrastructure ticket ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)).

### Google identity

2. Each Google Account stores Google's stable account ID (`sub`). Google sign-in finds the Account by this ID, never by email. This follows [Google's OpenID Connect guidance](https://developers.google.com/identity/openid-connect/openid-connect#an-id-tokens-payload).
3. The app refuses a Google sign-in when `email_verified` is not `true`.
4. A Google sign-in with an unknown ID and an unused email makes a new student Account.
5. When the Google email changes, the Account stays attached to the same Google ID. The DrillMap email does not change.

### One sign-in method for each Account

6. An Account uses a password or Google, never both. The app never joins two methods because the emails match. There is no linking or unlinking. Linking on purpose from the Account page can come later, when students ask for it.

**Why:** Fewer than 50 students are expected. One method for each Account is less work and has fewer ways to fail.

### Email verification and signup

7. A password Account must verify its email before its first sign-in. The verification link works once and expires after 24 hours.
8. A pending Account (not yet verified) holds no data. A newer signup for the same email replaces it. The app deletes it after 7 days.
9. The signup screen always says "Check your email." Then the app does one of these:

| Email belongs to | What the app does |
| --- | --- |
| No Account | Makes a pending Account and sends the verification link. |
| A pending Account | Replaces the pending Account and sends a new link. |
| A verified password Account | Sends "You already have an Account. Sign in, or reset your password." |
| A Google Account | Sends "You sign in with Google." Makes no Account. |

### A Google sign-in finds an email in use

| Email belongs to | What the app does |
| --- | --- |
| A pending password Account | Deletes the pending Account and makes a Google Account. Google proved that the person owns the email. |
| A verified password Account | Refuses: "This email uses a password. Sign in with your password." |
| A Google Account with a different Google ID | Refuses. The Account does not move. |

### Passwords

10. Passwords are hashed with bcrypt.
11. A password has at least 8 characters and at most 72 UTF-8 bytes. Signup, login, reset, and change all refuse a longer password with a clear message.
12. There are no composition rules. The rule "letters and digits" is removed.
13. Signup, reset, and change refuse a password that is on a bundled list of common passwords (for example, the top 100,000), the person's own email, or "drillmap". Existing passwords are not checked.

**Why:** A byte cap closes the truncation gap without a new hashing library. It allows fewer than 64 characters when a password uses many multibyte characters, which is below ASVS `v5.0.0-6.2.9`. The owner accepts this.

### Login

14. A wrong email and a wrong password show the same message.
15. The server does the same hash work when the Account does not exist.
16. After a correct password on an unverified Account, the app says to verify and sends a new link.

### Password reset and change

17. "Forgot password" always shows the same message. This is true for an unknown email, a password Account, and a Google Account.
18. A reset link works once and expires after 30 minutes. The app stores only a hash of the token. A new request cancels older links.
19. For a Google Account, the reset email says to sign in with Google.
20. A reset sets the new password, marks the email verified, and signs out all devices.
21. A password change needs the current password or a recent sign-in. It signs out other devices.

### Sessions and revocation

22. Student sessions end after 14 days without use and always 30 days after sign-in.
23. Admin sessions always end 24 hours after sign-in.
24. Every protected request checks the database: the Account exists, it is not disabled, its role, and its session version. A removed power stops on the next protected request. A request that is already running finishes.

### Sign out everywhere

25. The Account page has a "Sign out of all devices" button.
26. The app also signs out all devices after a reset, a password change, account deletion, disabling, and an admin role change.
27. The ordinary "Sign out" ends only the current browser.

### Disabled Accounts

28. The owner can set a disabled flag in the database. There is no UI. A disabled Account cannot sign in, and its sessions stop on the next protected request.

### Recent sign-in

29. Account deletion and password change need a sign-in within the last 10 minutes. If the last sign-in is older, the person signs in again. For a password change, entering the current password counts as a new sign-in.
30. Admins still cannot delete their own Accounts.

### Admins

31. Admin Accounts use Google only and have no password. The app refuses password sign-in for an admin, even when a password hash exists.
32. Only the owner sets or removes the admin role, in the database. No UI does this.
33. Both admins keep Google 2-Step Verification on. The app cannot see this setting for personal Google accounts, so the owner checks it and records the date.

**Why:** There are two admins. Google already gives strong two-step sign-in. Building MFA into the app is more work for no extra protection at this size.

### Google sign-in client

34. Before launch, the owner adds the home, privacy, and terms links on the production domain.
35. The owner adds no logo, because a logo starts Google's brand review.
36. The owner publishes the client to "In production" with only the scopes `openid email profile`.
37. The copy of the site uses its own client. That client can stay in Testing.

### Migration of existing Accounts

38. Existing password Accounts start as "not verified." The 7-day delete rule does not apply to them, because they hold real data. At the next password sign-in, the app sends a verification link. The student must use it before they continue.
39. Existing Accounts with no password were made by Google sign-in. At the next Google sign-in, the app stores the Google ID one time if the verified email matches. This is the only email match the app allows, and only for these Accounts.
40. Existing password Accounts that a student also opened with Google follow rule 6. Google sign-in is refused, and the student uses the password or resets it. If an attacker registered the email first, the attacker cannot verify it, and the real student gets control through reset.
41. Before release, the owner removes any password from both admin Accounts. Their Google IDs are stored as in rule 39. Migration never changes a role.
42. Migration marks no email as verified. Only a used link, a reset, or a verified Google sign-in does that.
43. All sessions end at release. Everyone signs in again one time.

## Checks

These rows replace B1 to B9 and H6 in [release-gate.md](release-gate.md#b-sign-in-and-accounts), and add B10.

| ID | Check | Kind | Rules |
| --- | --- | --- | --- |
| B1 | Keep a session in two browsers. Then demote, disable, delete, reset the password, change the password, or press "Sign out of all devices." The next protected request in the other browser is refused, including admin pages, onboarding, and extraction. No paid call starts and no record is recreated. A disabled Account cannot sign in. Student sessions end after 14 days without use and 30 days after sign-in. Admin sessions end 24 hours after sign-in. | Auto, Copy | 22 to 28 |
| B2 | A known Google ID opens its Account after the Google email changes, and the DrillMap email stays the same. A new Google ID with the email of a Google Account is refused. A Google profile whose `email_verified` is not `true` is refused. | Auto, Copy | 2 to 5 |
| B3 | A password signup with someone else's email makes a pending Account that cannot sign in. The real owner gets the email back through Google sign-in or a newer signup. The signup screen is the same for all four signup cases. A pending Account is deleted after 7 days. | Copy | 7 to 9 |
| B4 | A Google sign-in with the email of a verified password Account is refused and starts no session. A password signup with the email of a Google Account makes no Account. No Account has both a password and a Google ID. | Auto, Copy | 6, 9 |
| B5 | Signup, login, reset, and change refuse passwords over 72 UTF-8 bytes. A multibyte password of exactly 72 bytes works. Two passwords with the same first 72 bytes cannot both work. | Auto | 10, 11 |
| B6 | Signup, reset, and change refuse a password on the common list, the person's own email, and "drillmap". | Auto | 13 |
| B7 | The reset screen is the same for an unknown email, a password Account, and a Google Account. A reset link works once, expires after 30 minutes, and stops working when a newer link is requested. The database holds only token hashes. A reset signs out all devices. Login gives the same message, with the same hash work, for a wrong email and a wrong password. | Copy | 14, 15, 17 to 20 |
| B8 | On synthetic data shaped like the real data, rules 38 to 43 hold. No role changes. No email becomes verified without a link, a reset, or a verified Google sign-in. Every session from before the release is refused. | Copy | 38 to 43 |
| B9 | An admin password sign-in is refused, even when a password hash exists. Admin Accounts have no password after migration. Both admins have Google 2-Step Verification on, with the date recorded. | Copy, Settings | 31 to 33 |
| B10 | Account deletion and password change are refused when the last sign-in is more than 10 minutes old. They work after a new sign-in. A password change also works with the current password. | Auto, Copy | 21, 29 |
| H6 | The Google sign-in client has home, privacy, and terms links and no logo. It is published to "In production" with only `openid email profile`. The copy of the site uses a separate client. | Settings | 34 to 37 |

## Not decided here

- Signup and login rate limits belong to the abuse ticket ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)).
- Cookie settings and sign-in event logs belong to the browser and data ticket ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)).
- The email provider's key, sending domain, and rotation belong to the infrastructure ticket ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)).

## Decisions recorded

The owner made each decision in the issue 74 discussion.

| Topic | Answer |
| --- | --- |
| Email provider | Add one. |
| Google identity | Store the Google ID, require a verified email, and make new Accounts for new IDs. |
| Password length and hashing | Keep bcrypt with a 72-byte cap. |
| Common passwords | A bundled local list. |
| Session length | Students 14 days without use and 30 days at most. Admins 24 hours. |
| Revocation | On the next protected request. |
| Sign out everywhere | A button, plus automatic sign-out after account changes. |
| Disable | A database flag set by the owner. |
| Recent sign-in | 10 minutes, for deletion and password change. |
| Admin MFA | Google only, with 2-Step Verification checked by hand. |
| Google client | Add the links, no logo, and publish. |
| Email verification | Before first sign-in. |
| Linking | One method for each Account. No linking for launch. |
| Reset and change | As in rules 17 to 21. |
| Admin Accounts | As in rules 31 to 33. |
| Login messages | As in rules 14 to 16. |
| Signup message | As in rule 9. |
| Email in use at Google sign-in | As in the table under "A Google sign-in finds an email in use." |
| Migration | As in rules 38 to 43. |
