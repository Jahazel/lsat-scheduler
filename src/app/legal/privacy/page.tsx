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
            Encrypted service backups may retain deleted active data for up to 30 days so that we can recover from a
            service failure. Backups expire on that schedule and are not used to restore a deleted account except when
            required to recover the service as a whole.
          </p>
        </div>
      </div>
    </div>
  );
}
