import Image from "next/image";
import Link from "next/link";
import { HeroCards } from "@/components/landing/HeroCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { QuestionList } from "@/components/landing/QuestionList";
import { RevealSection } from "@/components/landing/RevealSection";
import { GapBand, SectionGrid, SectionLabel } from "@/components/landing/SectionGrid";
import { FREE_WEEK_NOTE, LinkArrow, StartFreeWeekLink } from "@/components/landing/StartFreeWeekLink";
import { FOCUS, cx } from "@/components/ui/classes";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";

const HERO_SCREEN_SIZES = "(min-width: 1024px) 1120px, (min-width: 768px) 672px, 840px";
const HERO_SCREEN_IMAGE = "block h-auto w-[840px] max-w-none md:w-[672px] lg:w-[1120px]";

export default function LandingPage() {
  return (
    <div data-page-fade className="flex flex-col items-center overflow-x-clip bg-vellum px-5 md:px-0">
      <section aria-labelledby="landing-title" className="relative isolate flex w-full flex-col items-center overflow-y-clip pt-[86px] pb-12 md:pt-[184px] lg:pt-[166px]">
        <div aria-hidden="true" className="hero-dots pointer-events-none absolute inset-y-0 left-1/2 -z-20 w-screen -translate-x-1/2" />
        <div className="relative z-2 flex w-full flex-col items-center gap-4 text-center md:w-[680px] md:gap-5 lg:w-[800px] lg:gap-6">
          <h1 id="landing-title" tabIndex={-1} className="outline-none text-[42px]/[44px] font-semibold tracking-[-0.04em] text-balance text-ink md:text-[58px]/[60px] lg:text-[76px]/[78px]">
            Your practice results, turned into next week&apos;s plan
          </h1>
          <p className="text-body text-smoke md:w-[520px] md:text-[18px]/[28px] lg:w-[600px] lg:text-lead">
            Upload your analytics every weekend. DrillMap builds Monday to Sunday around the question types you miss most.
          </p>
        </div>
        <div className="relative z-2 flex w-full flex-col items-center gap-3 pt-6 md:gap-[14px] md:pt-7 lg:pt-9">
          <StartFreeWeekLink className="h-[52px] w-full px-7 md:w-auto" />
          <p className="text-small text-smoke">{FREE_WEEK_NOTE}</p>
        </div>

        <HeroCards />

        <div className="relative mt-7 flex w-full justify-center md:mt-[110px] lg:mt-[118px]">
          <div aria-hidden="true" className="hero-glow pointer-events-none absolute top-1/2 left-1/2 -z-10 w-screen -translate-1/2" />
          <div className="relative z-2 h-[460px] w-full overflow-clip rounded-md bg-paper shadow-e2 md:h-[432px] md:w-[672px] lg:h-[720px] lg:w-[min(1120px,calc(100%-48px))]">
            <Image
              src="/landing/hero-app-nav.png"
              alt=""
              width={2880}
              height={144}
              sizes={HERO_SCREEN_SIZES}
              loading="eager"
              className={HERO_SCREEN_IMAGE}
            />
            <Image
              src="/landing/hero-this-week.png"
              alt="This week screen: your plan for this week, with Monday to Sunday drills"
              width={2880}
              height={3094}
              sizes={HERO_SCREEN_SIZES}
              loading="eager"
              className={HERO_SCREEN_IMAGE}
            />
          </div>
        </div>
      </section>

      <SectionGrid>
        <GapBand />
        <HowItWorks />
        <GapBand />
        <PricingSection />
        <GapBand />
        <QuestionsSection />
        <GapBand />
        <ClosingSection />
      </SectionGrid>
    </div>
  );
}

const PLAN_RULE = "border-dashed border-ink/14";

function PricingSection() {
  const price = planPriceText(PLAN_PRICES);
  return (
    <RevealSection threshold={0.25} id="pricing" aria-labelledby="pricing-title" className="flex w-full scroll-mt-16 flex-col items-center">
      <SectionLabel id="pricing-title" number="03">Pricing</SectionLabel>
      <div className="w-full md:w-[min(720px,calc(100%-48px))] lg:w-[min(1120px,calc(100%-48px))]">
        <div className="grid gap-5 pt-8 pb-7 md:pt-14 md:pb-10 lg:grid-cols-2 lg:items-end lg:gap-0 lg:px-6 lg:pt-[72px] lg:pb-14">
          <p className="reveal-item max-w-[480px] text-[32px]/[38px] font-semibold tracking-[-0.03em] text-balance text-ink md:text-[40px]/[46px] lg:text-[48px]/[54px]">
            Your <span className="spectrum-key">first full week</span> is free
          </p>
          <p className="reveal-item max-w-[400px] text-[17px]/[27px] text-smoke [--reveal-delay:80ms] lg:pl-6">
            Pick a plan when your free week ends. Both plans get the same weekly schedule.
          </p>
        </div>
        <div className={`grid gap-3 md:grid-cols-2 md:gap-0 md:border-y ${PLAN_RULE}`}>
          <PlanCard id="plan-weekly" name="Weekly" price={price.weekly} per="a week" className="[--reveal-delay:160ms]">
            Pay week by week. Good for a short final push.
          </PlanCard>
          <PlanCard
            id="plan-monthly"
            name="Monthly"
            price={price.monthly}
            per="a month"
            badge={`Best value · ${price.monthlySaving}`}
            className="[--reveal-delay:240ms]"
          >
            {price.monthOnWeekly}. Good for a full prep cycle.
          </PlanCard>
        </div>
        <p className="reveal-item pt-5 text-small text-smoke [--reveal-delay:320ms] lg:px-6">
          Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.
        </p>
      </div>
    </RevealSection>
  );
}

function bothPlans() {
  const price = planPriceText(PLAN_PRICES);
  return `Weekly (${price.weekly}) or Monthly (${price.monthly})`;
}

function QuestionsSection() {
  const plans = bothPlans();
  return (
    <RevealSection threshold={0.2} aria-labelledby="questions-title" className="flex w-full flex-col items-center">
      <SectionLabel id="questions-title" number="04">FAQ</SectionLabel>
      <div className="grid w-full gap-5 pt-8 md:w-[min(720px,calc(100%-48px))] md:gap-8 md:pt-14 lg:w-[min(1120px,calc(100%-48px))] lg:grid-cols-4 lg:items-start lg:gap-0 lg:pt-[72px]">
        <p aria-hidden="true" className="reveal-item text-[32px]/[38px] font-semibold tracking-[-0.03em] text-ink md:text-[40px]/[46px] lg:sticky lg:top-28 lg:px-6 lg:text-[48px]/[54px]">
          FAQ
        </p>
        <QuestionList
          className="lg:col-span-3"
          questions={[
            { question: "Do I need a card to start?", answer: `No. Your first full week is free. You pick ${plans} only when it ends.` },
            { question: "What happens after the free week?", answer: `Pick ${plans} to keep getting weekly schedules.` },
            { question: "Can I cancel?", answer: "Any time. You keep access until your paid week or month ends. No refunds for unused time." },
            { question: "Which practice sites work?", answer: "7Sage today, with more sites coming. You can also type your numbers by hand." },
            {
              question: "Is the plan made by AI?",
              answer: "No. Fixed rules built from the tutor's coaching method make the plan. AI only reads your screenshots, and you check what it read.",
            },
          ]}
        />
      </div>
    </RevealSection>
  );
}

function ClosingSection() {
  return (
    <RevealSection threshold={0.25} aria-labelledby="closing-title" className="flex w-full flex-col items-center">
      <SectionLabel id="closing-title" number="05">Start</SectionLabel>
      <div className="grid w-full gap-y-10 pt-14 pb-16 md:w-[min(720px,calc(100%-48px))] md:grid-cols-2 md:gap-y-14 md:pt-24 md:pb-28 lg:w-[min(1120px,calc(100%-48px))] lg:grid-cols-4 lg:items-start lg:pt-32 lg:pb-36">
        <div className="reveal-item flex flex-col items-start gap-5 md:col-span-2 lg:px-6">
          <p className="max-w-[480px] text-[34px]/[40px] font-semibold tracking-[-0.03em] text-balance text-ink md:text-[44px]/[50px]">
            Get next week&apos;s plan from your own analytics
          </p>
          <p className="text-[17px]/[27px] text-smoke">{FREE_WEEK_NOTE}</p>
          <div className="flex w-full flex-col gap-2.5 pt-3 md:w-auto md:flex-row">
            <StartFreeWeekLink arrow className="h-12 w-full gap-1.5 px-[22px] md:w-auto" />
            <Link
              href="/login"
              className={cx(
                "login-ghost inline-flex h-12 items-center justify-center rounded-sm border bg-paper px-[22px] text-body font-medium text-ink",
                FOCUS,
              )}
            >
              Log in
            </Link>
          </div>
        </div>
        <Signpost icon={<PriceTagIcon />} title="See what you'll pay" href="#pricing" link="Pricing" className="[--reveal-delay:80ms]">
          {bothPlans()}. Pick one when your free week ends.
        </Signpost>
        <Signpost icon={<RepeatIcon />} title="See how it works" href="#how-it-works" link="How it works" className="[--reveal-delay:160ms]">
          Four steps. The last one repeats every weekend.
        </Signpost>
      </div>
    </RevealSection>
  );
}

function Signpost({ icon, title, href, link, className, children }: {
  icon: React.ReactNode;
  title: string;
  href: string;
  link: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("reveal-item flex flex-col items-start gap-2 md:pr-6 lg:pl-6", className)}>
      <span className="mb-4 grid size-10 place-items-center rounded-[10px] border border-vellum-line bg-paper">{icon}</span>
      <h3 className="text-[16px]/[22px] font-semibold text-ink">{title}</h3>
      <p className="text-[15px]/[23px] text-smoke">{children}</p>
      <a href={href} className={cx("signpost-link mt-2 inline-flex items-center gap-1 rounded-xs text-[15px] font-medium text-ink", FOCUS)}>
        {link}
        <LinkArrow />
      </a>
    </div>
  );
}

function PriceTagIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" className="text-spectrum-violet">
      <path
        d="M3 10.6V4a1 1 0 0 1 1-1h6.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 0 1.4l-6.6 6.6a1 1 0 0 1-1.4 0L3.3 11.3a1 1 0 0 1-.3-.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="7" cy="7" r="1.3" fill="currentColor" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" className="text-spectrum-pink">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 8A6 6 0 0 0 4.6 6.2M4.5 12a6 6 0 0 0 10.9 1.8" />
        <path d="M4.2 3v3.6h3.6M15.8 17v-3.6h-3.6" />
      </g>
    </svg>
  );
}

function PlanCard({ id, name, price, per, badge, className, children }: {
  id: string;
  name: string;
  price: string;
  per: string;
  badge?: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <article aria-labelledby={id} className={cx("reveal-item relative isolate flex md:p-4 lg:p-6", badge && "p-3", className)}>
      {badge && (
        <div aria-hidden="true" className="absolute inset-0 -z-10 rounded-[18px] step-mat-spectrum [--mat-edge:2%] [--mat-spectrum-at:50%_85%] md:rounded-none" />
      )}
      <div className={cx("plan-card flex flex-1 flex-col gap-3 rounded-[14px] border bg-paper p-6 lg:p-8", badge ? "plan-card-best" : "border-vellum-line")}>
        <div className="flex min-h-[26px] flex-wrap items-center justify-between gap-3 md:flex-nowrap">
          <h3 id={id} className="font-mono text-caption tracking-[0.06em] text-smoke uppercase">{name}</h3>
          {badge && (
            <span className="flex h-[26px] items-center rounded-pill bg-ink px-2 text-caption font-medium text-chalk lg:px-2.5 lg:text-[13px]/[18px]">
              {badge}
            </span>
          )}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 pt-2">
          <span className="text-[48px]/[52px] font-semibold tracking-[-0.04em] text-ink tabular-nums lg:text-[56px]/[60px]">{price}</span>
          <span className="text-[17px] text-smoke">{per}</span>
        </p>
        <p className="mb-7 min-h-12 max-w-[340px] text-[15px]/[24px] text-smoke">{children}</p>
        <div className={`mt-auto flex flex-col gap-[14px] border-t pt-6 ${PLAN_RULE}`}>
          <p className="text-small text-ink">{FREE_WEEK_NOTE}</p>
          <StartFreeWeekLink className="h-12 w-full" />
        </div>
      </div>
    </article>
  );
}
