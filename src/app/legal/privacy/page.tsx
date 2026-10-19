export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Privacy Policy</h1>
        <div className="mt-4 space-y-4 text-sm leading-6 text-ink-600">
          <p>
            DrillMap stores the account and study information needed to provide your study plan, including your
            profile, approved analytics snapshots, weekly schedules, and activity check-ins. We use this information
            to generate and display your adaptive weekly schedule and to preserve your study history.
          </p>
          <p>
            You may delete your account from the Account page at any time. Deletion removes your user account,
            profile, approved and legacy analytics snapshots, weekly schedules, and activity check-ins from active
            storage. Deletion requests are not used to rewrite records belonging to other students.
          </p>
          <p>
            These companies handle your data for us. Vercel runs the website. Neon stores the database. Google handles
            sign-in if you choose &ldquo;Continue with Google.&rdquo; Anthropic, an AI company, reads the analytics
            screenshots you upload. Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does
            not store the screenshot. Crop out anything you do not want to share before you upload.
          </p>
          <p>
            Neon keeps daily backups of the database for 14 days, so deleted data can remain in a backup until it
            expires. We use backups only to recover the service after a failure. They are not used to restore a deleted
            account except when required to recover the service as a whole.
          </p>
        </div>
      </div>
    </div>
  );
}
