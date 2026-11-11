# Restore from a backup

Runbook for [issue 353](https://github.com/Jahazel/lsat-scheduler/issues/353). It brings back the
database from a Neon backup without bringing back a deleted Account. It covers rules 31 and 32 of the
[browser and data rules](../security/issue-76-decisions.md#restores) and launch check F4. A restore
still needs the owner's approval before the site uses the restored branch.

## Words in this file

- **Restored branch**: the new Neon branch that a restore makes from a backup or a past moment.
- **Current branch**: the branch the site uses now. It holds the newest deletion list.
- **Deletion list**: the `deletion_list` table. One row for each deleted Account: its ID, a keyed hash
  of its email, and the date. Rows are deleted after 30 days.
- **Replay**: `npm run replay-deletions`. It deletes from the restored branch every Account on the
  current branch's deletion list, by ID or by email hash, and every Account the current branch marks
  as deleting, with all its records. It copies the list
  rows to the restored branch. It prints only two counts. A second run deletes nothing.
- **Billing resync**: `npm run resync-billing`. It asks Stripe for every subscription and saves each one's
  current state on the restored branch, with the same code the Stripe message receiver uses. Billing state
  follows Stripe, so a plan started, changed, or cancelled after the backup comes back as Stripe holds it.
  It saves nothing for an Account the replay deleted, so a deleted Account's plan does not come back. When
  Stripe still holds an open plan for an Account on the deletion list, it ends that plan in Stripe. It
  skips a subscription whose price is not Weekly or Monthly, goes on with the rest, and names the skipped
  subscription IDs. It prints only those IDs and five counts. A second run saves the same records.
- **Age check**: `npm run check-backup-ages`. It reads the real age of every Neon snapshot and every
  branch except the active one. It fails when any can hold data older than 30 days, and names each
  one by its Neon name.

## Why the order matters

A backup made before a deletion still holds the deleted Account. The site must not use the restored
branch until the replay has run. The deletion list keeps rows for 30 days, so a backup older than
30 days can hold an Account whose row is gone. The age check finds such a copy.

## Steps

Do every step in order. Do not change the site's `DATABASE_URL` before step 7.

1. **Restore into a new branch.** In the Neon console, restore the backup or the past moment into a
   new branch. Do not use the restore that replaces the current branch: the site would use the
   restored data at once, before the replay. Record the restored branch's name and ID, the backup
   time, and the restore start and end times.
2. **Run the age check with the current branch still active.** Use the backup checker's settings
   from the [backup checker guide](../security/backup-checker.md#checked-behavior):
   `BACKUP_PROJECT_ID`, the current branch's ID as `BACKUP_BRANCH_ID`, and `NEON_API_KEY`.

   ```sh
   npm run check-backup-ages
   ```

   It must not name the restored branch. If it does, the restored branch's backup is older than 30
   days, or Neon no longer lists the backup it came from (`"ageDays": "unknown"`). Stop: the deletion list
   cannot cover that backup. Delete the restored branch and restore a newer backup. If it names only
   other copies, go on, and remove them in step 9.
3. **Bring the restored branch up to the current migrations.** The replay needs the
   `deletion_list` table from migration `0017_two_step_deletion`. Apply any missing migration as the
   [release migrations runbook](release-migrations.md) says, on the restored branch only.
4. **Run the replay.** Copy the owner connection string of each branch from the Neon console's
   Connect dialog, with `sslmode=verify-full`. Type secrets at a hidden prompt, never on the command
   line or in a file:

   ```sh
   read -rs DATABASE_URL        # the restored branch
   read -rs DELETION_LIST_URL   # the current branch
   read -rs AUTH_SECRET         # the site's AUTH_SECRET from Vercel, for the email hashes
   export DATABASE_URL DELETION_LIST_URL AUTH_SECRET
   npm run replay-deletions
   ```

   It prints `Deletion list rows: N. Restored Accounts deleted: M.` Record both counts. Run it a
   second time. It must print `Restored Accounts deleted: 0.` Then `unset DATABASE_URL
   DELETION_LIST_URL AUTH_SECRET`. If the current branch is lost, the deletions since the backup are
   lost too. Stop and ask the owner before going on.

   The script refuses every host except a local database and the approved copy hosts in
   `scripts/copyDatabaseHosts.json`. A restored branch has a new host. On the copy, the owner adds
   that host to the list in the local checkout for this run and removes it after. The script cannot
   reach a production host. A production restore waits for the owner's decision on how to run the
   replay there.
5. **Run the billing resync.** Run it only after the replay. Copy the site's `STRIPE_SECRET_KEY` from
   Vercel: the copy's test-mode key for a copy restore, the live key for the real site. Use the restored
   branch's owner connection string again:

   ```sh
   read -rs DATABASE_URL        # the restored branch
   read -rs STRIPE_SECRET_KEY   # the site's STRIPE_SECRET_KEY from Vercel
   export DATABASE_URL STRIPE_SECRET_KEY
   npm run resync-billing
   ```

   It prints `Stripe subscriptions: N. Billing records saved: S. Left out: L. Skipped for a price that is
   not Weekly or Monthly: K (sub_…). Billing records Stripe does not list: U.` Left out counts
   subscriptions of deleted Accounts, of Admins, and an Account's older subscriptions. Record the five
   counts. When `K` is not 0, the script exits with an error after it resyncs the rest: those
   subscriptions use a price this site does not sell. Give the owner their IDs; the Stripe message
   receiver keeps refusing them too. Run it a second time. It must print the same counts. Then `unset
   DATABASE_URL STRIPE_SECRET_KEY`. When `U` is not 0, the script exits with an error: the restored
   branch holds a billing record that this Stripe account does not know, which usually means the key is
   from the other mode. Check the key and run it again. If `U` stays above 0, stop and ask the owner. The
   same host rule as the replay applies.
6. **Check the result.** In Neon's SQL Editor on the restored branch, compare the table counts with
   the counts at the backup time minus the deleted Accounts' records. Check that each deleted test
   Account is gone. Record counts only.
7. **Let the site use the restored branch.** With the owner's approval, change the site's
   `DATABASE_URL` in Vercel to the restored branch and deploy. Recheck both Admins.
8. **Protect the restored branch.** Set `BACKUP_BRANCH_ID` to the restored branch's ID in both
   backup checker environments. Run the backup checker and confirm a fresh backup of the restored
   branch.
9. **Remove expired copies and unused restore branches.** With the owner's approval of each one,
   delete in the Neon console the former current branch once no site uses it, every `_old_` branch,
   every other restore branch nobody uses, and every snapshot the age check named. Follow
   [owner retention cleanup](../security/backup-checker.md#owner-retention-cleanup). Then run the age
   check again with the restored branch's ID. It must report `within-30-days`.

## Evidence record

Record the UTC date, the commit, the restored branch name, the backup time, both age check results,
both replay counts, both billing resync counts, the table counts, and what was deleted in step 9. Record no email, Account ID,
connection string, or key.
