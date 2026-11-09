import type { ReactNode } from "react";

const PRIVACY_CONTACT_EMAIL = "privacy@drillmap.xyz";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-body font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <div data-page-fade className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 tabIndex={-1} className="text-h3 font-semibold text-ink outline-none">Privacy Policy</h1>
        <p className="mt-2 text-caption text-smoke">Last updated: November 8, 2026</p>
        <div className="mt-8 space-y-8 text-small leading-body text-smoke">
          <Section title="What DrillMap stores">
            <List>
              <li>
                Your Account: your name, your email address, your sign-in method (Google or password), and the date you
                last signed in. For a password, we store only a secure scramble (hash) of it, never the password itself.
              </li>
              <li>
                Your study information: your study settings, approved analytics snapshots, practice test results, weekly
                schedules, and activity check-ins.
              </li>
            </List>
            <p>
              We use this information only to make and show your weekly study schedule and your progress. We do not sell
              it. We do not show ads. We do not use tracking or advertising cookies. We use one cookie to keep you signed
              in.
            </p>
          </Section>

          <Section title="Who can see your data">
            <p>
              You can see your own data. The two people who run DrillMap (admins) can see every student&rsquo;s name,
              email address, weekly study time, and saved weekly schedule with its activity check-ins, for support and to
              check that the app works.
            </p>
          </Section>

          <Section title="Your 7Sage screenshots">
            <p>
              When you upload a screenshot, DrillMap sends it to Anthropic, an AI company, to read your analytics
              numbers. Anthropic keeps the image for up to 30 days and then deletes it. DrillMap does not store the
              screenshot. It stores only the numbers you review and approve. Crop out anything you do not want to share
              before you upload. AI does not make your schedule. Fixed rules make it from your approved numbers and
              settings.
            </p>
          </Section>

          <Section title="Companies that handle your data for us">
            <List>
              <li>Vercel runs the website.</li>
              <li>Neon stores the database.</li>
              <li>Google handles sign-in if you choose &ldquo;Continue with Google.&rdquo;</li>
              <li>Anthropic reads screenshots, as described above.</li>
              <li>Resend sends verification, password reset, and account notices.</li>
            </List>
          </Section>

          <Section title="Security records">
            <p>
              To protect your Account, we record security events, for example sign-ins, failed sign-ins, and password
              resets. Each record holds the time, the event, your Account ID, and the IP address of the request. It never
              holds your password or your screenshots. We delete these records after 90 days.
            </p>
          </Section>

          <Section title="How long we keep data">
            <List>
              <li>
                Your Account and study information: until you delete your Account. If you do not sign in for 2 years, we
                email you, and we delete your Account 30 days later.
              </li>
              <li>Security records: 90 days.</li>
            </List>
          </Section>

          <Section title="Deleting your Account">
            <p>
              You can delete your Account on the Account page. You must have signed in within the last 10 minutes.
              Deletion removes your Account, study settings, analytics snapshots, practice test results, weekly
              schedules, and activity check-ins. You are signed out on all devices. We keep only a short record that holds
              your Account ID and a scrambled form of your email. We use it for 30 days to make sure a restore from backup
              cannot bring your data back.
            </p>
          </Section>

          <Section title="Backups">
            <p>
              We keep daily database backups for 14 days. We use them only to recover the service after a failure. After
              a restore, we delete again every Account that was deleted before.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For questions about your data, or to ask us to delete your Account when you cannot sign in, email{" "}
              <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="text-ink underline underline-offset-3">
                {PRIVACY_CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
