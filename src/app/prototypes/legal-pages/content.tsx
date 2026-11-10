"use client";

import type { ReactNode } from "react";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";
import { goToPage } from "./protoContext";
import type { DatasetName, LegalPageId } from "./pages";

export type LegalSection = { id: string; title: string; body: ReactNode };

export type LegalPage = {
  id: LegalPageId;
  title: string;
  switcherLabel: string;
  dateLine?: string;
  sections?: LegalSection[];
  paragraphs?: ReactNode[];
};

const CONTACT_EMAIL = "privacy@drillmap.xyz";
export const LINK_CLASS = "text-ink underline underline-offset-3";

const List = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>;

const ContactLink = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
    {CONTACT_EMAIL}
  </a>
);

function PageLink({ to, children }: { to: LegalPageId; children: ReactNode }) {
  return (
    <a
      href={`/legal/${to}`}
      onClick={(event) => {
        event.preventDefault();
        goToPage(to);
      }}
      className={LINK_CLASS}
    >
      {children}
    </a>
  );
}

const PrivacyLink = () => <PageLink to="privacy">Privacy Policy</PageLink>;

const slug = (title: string) =>
  title.toLowerCase().replace(/,/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const sections = (list: { title: string; body: ReactNode }[]): LegalSection[] => list.map((section) => ({ ...section, id: slug(section.title) }));

function termsSections(): LegalSection[] {
  const price = planPriceText(PLAN_PRICES);
  return sections([
    {
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
      title: "Cancelling and refunds",
      body: (
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
      ),
    },
    {
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
      title: "AI reads your screenshots",
      body: (
        <p>
          DrillMap uses AI to read the numbers in the 7Sage screenshots you upload. AI can misread a number. You must
          check the numbers AI reads and correct any that are wrong before you confirm them. Your weekly schedule uses
          the numbers you confirm. See <PageLink to="ai-disclosure">How DrillMap uses AI</PageLink> for more.
        </p>
      ),
    },
    {
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
      title: "Using DrillMap fairly",
      body: (
        <>
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
        </>
      ),
    },
    {
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
      title: "When we can end your access",
      body: (
        <p>
          We can suspend or close your Account if you break these Terms, if you misuse DrillMap, or if the law requires
          it. If we close your Account, your plan ends and Stripe makes no further charges.
        </p>
      ),
    },
    {
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
      title: "Contact",
      body: (
        <p>
          For questions about these Terms, email <ContactLink />. We send notices to the email address on your
          Account. These notices count as written notice.
        </p>
      ),
    },
  ]);
}

const privacySections = (): LegalSection[] =>
  sections([
    {
      title: "What DrillMap stores",
      body: (
        <>
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
        </>
      ),
    },
    {
      title: "Who can see your data",
      body: (
        <p>
          You can see your own data. The two people who run DrillMap (admins) can see every student&rsquo;s name,
          email address, weekly study time, and saved weekly schedule with its activity check-ins, for support and to
          check that the app works.
        </p>
      ),
    },
    {
      title: "Your 7Sage screenshots",
      body: (
        <p>
          When you upload a screenshot, DrillMap sends it to Anthropic, an AI company, to read your analytics
          numbers. Anthropic keeps the image for up to 30 days and then deletes it. DrillMap does not store the
          screenshot. It stores only the numbers you review and approve. Crop out anything you do not want to share
          before you upload. AI does not make your schedule. Fixed rules make it from your approved numbers and
          settings.
        </p>
      ),
    },
    {
      title: "Payments",
      body: (
        <>
          <p>
            Stripe sells your plan and takes your payment. Stripe is the seller, so your card and the other payment
            details you give Stripe go to Stripe, not to DrillMap. Stripe&rsquo;s own privacy policy covers them.
            DrillMap stores only the Stripe IDs of your customer record and plan, your plan (Weekly or Monthly), its
            Stripe status, its dates, and whether your first charge went through. We delete these with your Account.
          </p>
          <p>
            Each email address gets one free week in 12 months. When your free week starts, we save a scrambled form (hash) of your
            email address and the date in the used free week list. We keep each row for 12 months, even if you delete
            your Account, and then delete it.
          </p>
        </>
      ),
    },
    {
      title: "Companies that handle your data for us",
      body: (
        <List>
          <li>Vercel runs the website.</li>
          <li>Neon stores the database.</li>
          <li>Google handles sign-in if you choose &ldquo;Continue with Google.&rdquo;</li>
          <li>Anthropic reads screenshots, as described above.</li>
          <li>Stripe sells plans and takes payments, as described above.</li>
          <li>Resend sends verification, password reset, and account notices.</li>
        </List>
      ),
    },
    {
      title: "Security records",
      body: (
        <p>
          To protect your Account, we record security events, for example sign-ins, failed sign-ins, and password
          resets. Each record holds the time, the event, your Account ID, and the IP address of the request. It never
          holds your password or your screenshots. We delete these records after 90 days.
        </p>
      ),
    },
    {
      title: "How long we keep data",
      body: (
        <List>
          <li>
            Your Account and study information: until you delete your Account. If you do not sign in for 2 years, we
            email you, and we delete your Account 30 days later.
          </li>
          <li>Security records: 90 days.</li>
          <li>Used free week list: 12 months from the day your free week starts.</li>
        </List>
      ),
    },
    {
      title: "Deleting your Account",
      body: (
        <p>
          You can delete your Account on the Account page. You must have signed in within the last 10 minutes.
          Deletion removes your Account, study settings, analytics snapshots, practice test results, weekly
          schedules, and activity check-ins. You are signed out on all devices. We keep only a short record that holds
          your Account ID and a scrambled form of your email. We use it for 30 days to make sure a restore from backup
          cannot bring your data back. If you started a free week, its row in the used free week list stays until 12 months
          have passed.
        </p>
      ),
    },
    {
      title: "Backups",
      body: (
        <p>
          We keep daily database backups for 14 days. We use them only to recover the service after a failure. After
          a restore, we delete again every Account that was deleted before.
        </p>
      ),
    },
    {
      title: "Contact",
      body: (
        <p>
          For questions about your data, or to ask us to delete your Account when you cannot sign in, email <ContactLink />.
        </p>
      ),
    },
  ]);

const aiParagraphs = (): ReactNode[] => [
  <p key="1">
    DrillMap uses AI for one task only: reading the numbers in your 7Sage analytics screenshot. Anthropic&apos;s
    Claude model does this. You see the numbers before anything is saved, and you can correct them. If AI cannot
    read the screenshot, or if the monthly reading limit is reached, you can type the numbers in by hand.
  </p>,
  <p key="2">AI does not make your weekly schedule. Fixed rules make it from your approved numbers and study settings.</p>,
  <p key="3">
    Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does not store screenshots. See
    the <PrivacyLink /> for more.
  </p>,
];

function withArbitration(list: LegalSection[]): LegalSection[] {
  const at = list.findIndex((section) => section.id === "governing-law");
  const arbitration = {
    id: "dispute-resolution-arbitration-and-class-action-waiver",
    title: "Dispute resolution, arbitration, and class action waiver",
    body: <p><mark>[arbitration terms to be set after the lawyer review]</mark></p>,
  };
  return [...list.slice(0, at), arbitration, ...list.slice(at)];
}

const renamed = (list: LegalSection[], id: string, title: string) => list.map((section) => (section.id === id ? { ...section, title } : section));

export function legalPages(data: DatasetName): LegalPage[] {
  const worst = data === "worst";
  return [
    {
      id: "terms",
      title: worst ? "Terms of Service and Acceptable Use Policy" : "Terms of Service",
      switcherLabel: worst ? "Terms of Service" : "Terms",
      dateLine: worst ? "Effective date: September 30, 2027" : "Effective date: November 9, 2026",
      sections: worst ? renamed(withArbitration(termsSections()), "ai-reads-your-screenshots", "How AI reads your 7Sage screenshots and what you must check") : termsSections(),
    },
    {
      id: "privacy",
      title: worst ? "Privacy Policy and California Privacy Notice" : "Privacy Policy",
      switcherLabel: worst ? "Privacy Policy" : "Privacy",
      dateLine: worst ? "Last updated: September 30, 2027" : "Last updated: November 10, 2026",
      sections: privacySections(),
    },
    {
      id: "ai-disclosure",
      title: "How DrillMap uses AI",
      switcherLabel: worst ? "How DrillMap uses AI" : "AI disclosure",
      dateLine: worst ? "Last updated: September 30, 2027" : "Last updated: November 10, 2026",
      paragraphs: aiParagraphs(),
    },
  ];
}
