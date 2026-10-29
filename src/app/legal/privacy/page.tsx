export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-h3 font-semibold text-ink">Privacy Policy</h1>
        <div className="mt-4 space-y-4 text-small leading-body text-smoke">
          <p>
            DrillMap stores the account and study information needed to provide your study plan, including your
            profile, approved analytics snapshots, weekly schedules, and activity check-ins. We use this information
            to generate and display your adaptive weekly schedule and to preserve your study history.
          </p>
          <p>
            You may delete your account from the Account page at any time. Deletion removes your user account,
            profile, approved and legacy analytics snapshots, weekly schedules, and activity check-ins from active
            storage. Deletion requests are not used to rewrite records belonging to other students. We keep only a short
            record that holds your Account ID and a scrambled form of your email. We use it for 30 days to make sure a
            restore from backup cannot bring your data back.
          </p>
          <p>
            These companies handle your data for us. Vercel runs the website. Neon stores the database. Google handles
            sign-in if you choose &ldquo;Continue with Google.&rdquo; Resend sends DrillMap&rsquo;s email, such as the
            link to verify your email or reset your password. Anthropic, an AI company, reads the analytics
            screenshots you upload. Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does
            not store the screenshot. Crop out anything you do not want to share before you upload.
          </p>
          <p>
            To protect your Account, we record security events, for example sign-ins, failed sign-ins, and password
            resets. Each record holds the time, the event, your Account ID, and the IP address of the request. It never
            holds your password or your screenshots. We delete these records after 90 days.
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
