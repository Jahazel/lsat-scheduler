import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";

const CONTACT_EMAIL = "privacy@drillmap.xyz";

const ContactLink = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const PrivacyLink = () => <Link href="/legal/privacy">Privacy Policy</Link>;

function termsSections(): LegalSection[] {
  const price = planPriceText(PLAN_PRICES);
  return [
    {
      id: "about-these-terms",
      title: "About these Terms",
      body: (
        <>
          <p>
            These Terms are a contract between you and the owner of DrillMap (&ldquo;we&rdquo; or &ldquo;us&rdquo;).
            They cover your use of the DrillMap website and app. When you tick the &ldquo;I agree&rdquo; box or continue
            with Google at sign-up, you agree to these Terms. If you do not agree, do not use DrillMap.
          </p>
          <p>You must be at least 18 years old to use DrillMap.</p>
        </>
      ),
    },
    {
      id: "your-account",
      title: "Your Account",
      body: (
        <p>
          Give us true information when you sign up, and keep your email address current. Keep your password secret.
          You are responsible for what happens in your Account. If you think someone else has used your Account, tell
          us at <ContactLink /> at once.
        </p>
      ),
    },
    {
      id: "plans-the-free-week-and-renewal",
      title: "Plans, the free week, and renewal",
      body: (
        <>
          <p>
            DrillMap has two plans. Weekly costs {price.weekly} a week. Monthly costs {price.monthly} a month. Both plans
            give the same weekly schedules. Sales tax may be added where the law requires it.
          </p>
          <p>
            You pick a plan and add a card at the end of onboarding. Your plan starts with a free week. The free week
            runs from the end of onboarding to the Sunday that closes your first full Monday–Sunday week, so it lasts 7
            to 13 days. Your first charge is on the Monday after your free week ends. You get one free week. You get no
            free week if you had a plan before, or if your email address had a free week in the last 12 months. In that case,
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
        </>
      ),
    },
    {
      id: "cancelling-and-refunds",
      title: "Cancelling and refunds",
      body: (
        <ul>
          <li>
            You can cancel at any time on the Stripe Customer Portal. The Account page links to it. You do not need to
            email or call us.
          </li>
          <li>If you cancel during the free week, you pay nothing. You keep access until the free week ends.</li>
          <li>If you cancel after a payment, you keep access until the end of the week or month you paid for.</li>
          <li>We do not give refunds for unused time.</li>
          <li>You can switch between Weekly and Monthly on the Stripe Customer Portal. The switch starts at your next renewal.</li>
        </ul>
      ),
    },
    {
      id: "no-score-guarantee",
      title: "No score guarantee",
      body: (
        <p>
          DrillMap makes a weekly study schedule from your study settings and the numbers you confirm. DrillMap does not
          promise any LSAT score or result. Your result depends on your own study and on many things we do not
          control. DrillMap is a study tool. It is not tutoring, and it is not professional advice.
        </p>
      ),
    },
    {
      id: "ai-reads-your-screenshots",
      title: "AI reads your screenshots",
      body: (
        <p>
          DrillMap uses AI to read the numbers in the 7Sage screenshots you upload. AI can misread a number. You must
          check the numbers AI reads and correct any that are wrong before you confirm them. Your weekly schedule uses
          the numbers you confirm. See{" "}
          <Link href="/legal/ai-disclosure">
            How DrillMap uses AI
          </Link>{" "}
          for more.
        </p>
      ),
    },
    {
      id: "7sage-and-lsac",
      title: "7Sage and LSAC",
      body: (
        <p>
          DrillMap is not affiliated with, endorsed by, or sponsored by 7Sage or LSAC. 7Sage, LSAC, and LSAT are
          names and trademarks of their owners. Upload only screenshots of your own 7Sage account. You are responsible
          for following 7Sage&rsquo;s terms when you take them.
        </p>
      ),
    },
    {
      id: "using-drillmap-fairly",
      title: "Using DrillMap fairly",
      body: (
        <>
          <p>We give you a personal, non-transferable right to use DrillMap for your own study. Do not:</p>
          <ul>
            <li>share your Account, or sell or rent access to DrillMap;</li>
            <li>copy, change, or take apart DrillMap&rsquo;s code;</li>
            <li>try to get around a limit, a payment, or a security control;</li>
            <li>upload anything that is not yours to share, or anything harmful;</li>
            <li>use DrillMap to build a competing product.</li>
          </ul>
          <p>
            We own DrillMap and its content. If you send us ideas or feedback, we may use them freely, with no payment
            to you.
          </p>
        </>
      ),
    },
    {
      id: "your-data-and-deleting-your-account",
      title: "Your data and deleting your Account",
      body: (
        <>
          <p>
            Our <PrivacyLink /> explains what data we keep and how we use it. It is part of these Terms.
          </p>
          <p>
            You can delete your Account on the Account page. You must have signed in within the last 10 minutes.
            Deletion removes your Account and your study data, as the <PrivacyLink /> describes. If you have a plan, it
            ends at once. We do not refund unused time.
          </p>
        </>
      ),
    },
    {
      id: "when-we-can-end-your-access",
      title: "When we can end your access",
      body: (
        <p>
          We can suspend or close your Account if you break these Terms, if you misuse DrillMap, or if the law requires
          it. If we close your Account, your plan ends and Stripe makes no further charges.
        </p>
      ),
    },
    {
      id: "disclaimers-and-limits-on-liability",
      title: "Disclaimers and limits on liability",
      body: (
        <>
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
        </>
      ),
    },
    {
      id: "changes-to-drillmap-and-to-these-terms",
      title: "Changes to DrillMap and to these Terms",
      body: (
        <>
          <p>
            We may change or stop DrillMap features. If we stop DrillMap completely, we end all plans, and Stripe makes
            no further charges.
          </p>
          <p>
            We may update these Terms. If a change matters to you, we tell you by email or in the app before it takes
            effect. If you keep using DrillMap after that, you accept the new Terms. If you do not accept them, cancel
            your plan and stop using DrillMap.
          </p>
        </>
      ),
    },
    {
      id: "governing-law",
      title: "Governing law",
      body: (
        <p>
          The laws of the State of <mark>[state to be set before launch]</mark> govern these Terms, apart from its
          rules on which state&rsquo;s law applies. You keep any consumer rights that the law of the state where you
          live gives you. Either of us can bring a claim in small claims court.
        </p>
      ),
    },
    {
      id: "notice-for-california-residents",
      title: "Notice for California residents",
      body: (
        <p>
          Under California Civil Code Section 1789.3, you can contact the Complaint Assistance Unit of the Division of
          Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd.,
          Suite N112, Sacramento, CA 95834, or by phone at (800) 952-5210. To ask us a question or make a complaint
          about DrillMap, email <ContactLink />.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      body: (
        <p>
          For questions about these Terms, email <ContactLink />. We send notices to the email address on your
          Account. These notices count as written notice.
        </p>
      ),
    },
  ];
}

export default function TermsPage() {
  return <LegalPage id="terms" title="Terms of Service" dateLine="Effective date: November 9, 2026" sections={termsSections()} />;
}
