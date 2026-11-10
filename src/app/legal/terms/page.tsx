import Link from "next/link";
import type { ReactNode } from "react";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";

const CONTACT_EMAIL = "privacy@drillmap.xyz";
const LINK_CLASS = "text-ink underline underline-offset-3";

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

function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
      {CONTACT_EMAIL}
    </a>
  );
}

function PrivacyLink() {
  return (
    <Link href="/legal/privacy" className={LINK_CLASS}>
      Privacy Policy
    </Link>
  );
}

export default function TermsPage() {
  const price = planPriceText(PLAN_PRICES);
  return (
    <div data-page-fade className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 tabIndex={-1} className="text-h3 font-semibold text-ink outline-none">Terms of Service</h1>
        <p className="mt-2 text-caption text-smoke">Effective date: November 9, 2026</p>
        <div className="mt-8 space-y-8 text-small leading-body text-smoke">
          <Section title="About these Terms">
            <p>
              These Terms are a contract between you and the owner of DrillMap (&ldquo;we&rdquo; or &ldquo;us&rdquo;).
              They cover your use of the DrillMap website and app. When you tick the &ldquo;I agree&rdquo; box or continue
              with Google at sign-up, you agree to these Terms. If you do not agree, do not use DrillMap.
            </p>
            <p>You must be at least 18 years old to use DrillMap.</p>
          </Section>

          <Section title="Your Account">
            <p>
              Give us true information when you sign up, and keep your email address current. Keep your password secret.
              You are responsible for what happens in your Account. If you think someone else has used your Account, tell
              us at <ContactLink /> at once.
            </p>
          </Section>

          <Section title="Plans, the free week, and renewal">
            <p>
              DrillMap has two plans. Weekly costs {price.weekly} a week. Monthly costs {price.monthly} a month. Both plans
              give the same weekly schedules. Sales tax may be added where the law requires it.
            </p>
            <p>
              You pick a plan and add a card at the end of onboarding. Your plan starts with a free week. The free week
              runs from the end of onboarding to the Sunday that closes your first full Monday–Sunday week, so it lasts 7
              to 13 days. Your first charge is on the Monday after your free week ends. You get one free week. You get no
              free week if you had a plan before, or if your email address had a free week in the last 12 months. Then
              your plan starts and charges you on the day you pick it.
            </p>
            <p>
              Your plan renews on its own at the end of each week or month until you cancel. Each renewal charges your
              card the plan&rsquo;s price at that time. If we change a price, we tell you before the change applies to
              you.
            </p>
            <p>
              Stripe is the seller of record. Stripe takes your payment, collects sales tax, and sends your receipts. Your
              card details go to Stripe, not to DrillMap. Stripe&rsquo;s own terms also apply to your payment.
            </p>
            <p>
              If a renewal payment fails, Stripe tries your card again. You keep access for up to 7 days while it tries. If
              your first charge fails, or a renewal still fails after 7 days, your plan ends. You can still sign in and read
              This week and Progress, but you get no new weekly schedule until you pay for a plan again.
            </p>
          </Section>

          <Section title="Cancelling and refunds">
            <List>
              <li>
                You can cancel at any time on the Stripe Customer Portal. The Account page links to it. You do not need to
                email or call us.
              </li>
              <li>If you cancel during the free week, you pay nothing. You keep access until the free week ends.</li>
              <li>If you cancel after a payment, you keep access until the end of the week or month you paid for.</li>
              <li>We do not give refunds for unused time.</li>
              <li>You can switch between Weekly and Monthly on the Stripe Customer Portal. The switch starts at your next renewal.</li>
            </List>
          </Section>

          <Section title="No score guarantee">
            <p>
              DrillMap makes a weekly study schedule from your study settings and the numbers you confirm. DrillMap does not
              promise any LSAT score or result. Your result depends on your own study and on many things we do not
              control. DrillMap is a study tool. It is not tutoring, and it is not professional advice.
            </p>
          </Section>

          <Section title="AI reads your screenshots">
            <p>
              DrillMap uses AI to read the numbers in the 7Sage screenshots you upload. AI can misread a number. You must
              check the numbers AI reads and correct any that are wrong before you confirm them. Your weekly schedule uses
              the numbers you confirm. See{" "}
              <Link href="/legal/ai-disclosure" className={LINK_CLASS}>
                How DrillMap uses AI
              </Link>{" "}
              for more.
            </p>
          </Section>

          <Section title="7Sage and LSAC">
            <p>
              DrillMap is not affiliated with, endorsed by, or sponsored by 7Sage or LSAC. 7Sage, LSAC, and LSAT are
              names and trademarks of their owners. Upload only screenshots of your own 7Sage account. You are responsible
              for following 7Sage&rsquo;s terms when you take them.
            </p>
          </Section>

          <Section title="Using DrillMap fairly">
            <p>We give you a personal, non-transferable right to use DrillMap for your own study. Do not:</p>
            <List>
              <li>share your Account, or sell or rent access to DrillMap;</li>
              <li>copy, change, or take apart DrillMap&rsquo;s code;</li>
              <li>try to get around a limit, a payment, or a security control;</li>
              <li>upload anything that is not yours to share, or anything harmful;</li>
              <li>use DrillMap to build a competing product.</li>
            </List>
            <p>
              We own DrillMap and its content. If you send us ideas or feedback, we may use them freely, with no payment
              to you.
            </p>
          </Section>

          <Section title="Your data and deleting your Account">
            <p>
              Our <PrivacyLink /> explains what data we keep and how we use it. It is part of these Terms.
            </p>
            <p>
              You can delete your Account on the Account page. You must have signed in within the last 10 minutes.
              Deletion removes your Account and your study data, as the <PrivacyLink /> describes. If you have a plan, it
              ends at once. We do not refund unused time.
            </p>
          </Section>

          <Section title="When we can end your access">
            <p>
              We can suspend or close your Account if you break these Terms, if you misuse DrillMap, or if the law requires
              it. If we close your Account, your plan ends and Stripe makes no further charges.
            </p>
          </Section>

          <Section title="Disclaimers and limits on liability">
            <p>
              DrillMap is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; As far as the law allows, we make
              no promises that DrillMap will always work, be free of errors, or meet your needs.
            </p>
            <p>
              As far as the law allows, we are not responsible for indirect or consequential losses, such as lost data or
              lost time. Our total responsibility for any claim is limited to the greater of $50 or the amount you paid for
              DrillMap in the 6 months before the claim. Some states do not allow these limits. In those states, they apply
              only as far as that state&rsquo;s law allows.
            </p>
          </Section>

          <Section title="Changes to DrillMap and to these Terms">
            <p>
              We may change or stop DrillMap features. If we stop DrillMap completely, we end all plans, and Stripe makes
              no further charges.
            </p>
            <p>
              We may update these Terms. If a change matters to you, we tell you by email or in the app before it takes
              effect. If you keep using DrillMap after that, you accept the new Terms. If you do not accept them, cancel
              your plan and stop using DrillMap.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              The laws of the State of <mark>[state to be set before launch]</mark> govern these Terms, apart from its
              rules on which state&rsquo;s law applies. You keep any consumer rights that the law of the state where you
              live gives you. Either of us can bring a claim in small claims court.
            </p>
          </Section>

          <Section title="Notice for California residents">
            <p>
              Under California Civil Code Section 1789.3, you can contact the Complaint Assistance Unit of the Division of
              Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd.,
              Suite N112, Sacramento, CA 95834, or by phone at (800) 952-5210. To ask us a question or make a complaint
              about DrillMap, email <ContactLink />.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For questions about these Terms, email <ContactLink />. We send notices to the email address on your
              Account. These notices count as written notice.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
