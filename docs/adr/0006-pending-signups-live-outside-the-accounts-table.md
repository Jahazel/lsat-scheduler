# Pending signups live outside the Accounts table

Status: accepted. This ADR replaces the term "pending Account" in [Account rules](../security/issue-74-decisions.md) 7 to 9 and the Google sign-in table with "pending signup." The rules' behavior does not change.

The owner decided on 2026-10-25 ([spec #278](https://github.com/Jahazel/lsat-scheduler/issues/278), under [issue 230](https://github.com/Jahazel/lsat-scheduler/issues/230)) that a password signup whose email is not verified yet is not an Account. It lives in its own table, with the email, the name, the password hash, and a hash of the verification token. The app makes the Account only when the person presses the button on the verification page. In one transaction, it makes the password Account and deletes the pending signup. A newer signup for the same email replaces the row, and the app deletes a pending signup after 7 days.

The owner weighed one other option:

- **A "verified" date on each Account.** A signup makes an Account at once, with no verified date. Verification sets the date. This needs no second table, but every check that lets a person in must also refuse an Account with no verified date: password login, Google sign-in, the session step, reset, change password, deletion, and every Account page. One missed check lets an unverified person in, with an Account that holds an email they may not own.

A separate table makes the unsafe state impossible to reach. Every Account in the Accounts table has a proven email, so no check has to ask. The database also refuses an Account with both a password and a Google ID, and an Admin with a password.

## Consequences

- Login, the session step, and the Account pages need no "is this Account verified?" check. A pending signup cannot sign in, because no Account exists.
- Account rule 20's "marks the email verified" has nothing to mark: every password Account is verified when it is made.
- Signup, password login (Account rule 16), "Forgot password," and Google sign-in each read the pending signups table as well as the Accounts table. Each read ignores a pending signup older than 7 days, so a late daily cleanup changes nothing.
- A Google sign-in with the email of a pending signup deletes the pending signup and makes a Google Account. Google proved that the person owns the email.
- The limited app role gets read, insert, update, and delete on the pending signups table, and insert on the Accounts table for the verification step.
