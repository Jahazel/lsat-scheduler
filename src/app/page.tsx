import Image from "next/image";
import { HeroCards } from "@/components/landing/HeroCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { QuestionList } from "@/components/landing/QuestionList";
import { FREE_WEEK_NOTE, StartFreeWeekLink } from "@/components/landing/StartFreeWeekLink";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";

const HERO_SCREEN_SIZES = "(min-width: 1024px) 1120px, (min-width: 768px) 672px, 840px";
const HERO_SCREEN_IMAGE = "block h-auto w-[840px] max-w-none md:w-[672px] lg:w-[1120px]";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center overflow-x-clip bg-vellum px-5 md:px-0">
      <section aria-labelledby="landing-title" className="relative isolate flex w-full flex-col items-center pt-[86px] pb-12 md:pt-[184px] lg:pt-[166px]">
        <div aria-hidden="true" className="hero-dots pointer-events-none absolute inset-y-0 left-1/2 -z-20 w-screen -translate-x-1/2" />
        <div className="relative z-2 flex w-full flex-col items-center gap-4 text-center md:w-[680px] md:gap-5 lg:w-[800px] lg:gap-6">
          <h1 id="landing-title" className="text-[42px]/[44px] font-semibold tracking-[-0.04em] text-balance text-ink md:text-[58px]/[60px] lg:text-[76px]/[78px]">
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

      <HowItWorks />

      <PricingSection />

      <QuestionsSection />

      <section aria-labelledby="closing-title" className="flex w-full flex-col items-center gap-8 py-24 md:pt-32 md:pb-28 lg:pt-40 lg:pb-32">
        <h2 id="closing-title" className="text-center text-[36px]/[40px] font-semibold tracking-display text-balance text-ink md:max-w-[600px] md:text-h2 lg:max-w-[800px] lg:text-h1">
          Get next week&apos;s plan from your own analytics
        </h2>
        <div className="flex flex-col items-center gap-[14px]">
          <StartFreeWeekLink className="h-[52px] px-7" />
          <p className="text-small text-smoke">{FREE_WEEK_NOTE}</p>
        </div>
      </section>
    </div>
  );
}

function PricingSection() {
  const price = planPriceText(PLAN_PRICES);
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="flex w-full scroll-mt-16 flex-col items-center gap-12 pt-[72px] md:max-w-[672px] md:pt-24 lg:max-w-[1120px] lg:pt-40">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 id="pricing-title" className="text-[32px]/[38px] font-semibold tracking-heading text-balance text-ink md:text-h2">
          Your first full week is free
        </h2>
        <p className="text-body text-smoke md:max-w-[600px] md:text-lead">
          Pick a plan when your free week ends. Both plans get the same weekly schedule.
        </p>
      </div>
      <div className="grid w-full gap-4 md:grid-cols-2 md:gap-6 lg:w-auto lg:grid-cols-[400px_400px]">
        <PlanCard id="plan-weekly" name="Weekly" price={price.weekly} per="a week">
          Pay week by week. Good for a short final push.
        </PlanCard>
        <PlanCard
          id="plan-monthly"
          name="Monthly"
          price={price.monthly}
          per="a month"
          badge={`Best value · ${price.monthlySaving}`}
        >
          {price.monthOnWeekly}. Good for a full prep cycle.
        </PlanCard>
      </div>
      <p className="text-center text-small text-smoke">
        Cancel anytime. You keep access until your paid week or month ends. No refunds for unused time.
      </p>
    </section>
  );
}

function QuestionsSection() {
  const price = planPriceText(PLAN_PRICES);
  const plans = `Weekly (${price.weekly}) or Monthly (${price.monthly})`;
  return (
    <section aria-labelledby="questions-title" className="flex w-full flex-col gap-8 pt-[72px] md:max-w-[672px] md:pt-24 lg:max-w-[1120px] lg:flex-row lg:items-start lg:gap-24 lg:pt-40">
      <h2 id="questions-title" className="text-[32px]/[38px] font-semibold tracking-heading text-ink md:text-h2 lg:w-[360px] lg:shrink-0">
        Questions
      </h2>
      <QuestionList
        questions={[
          { question: "Do I need a card to start?", answer: `No. Your first full week is free. You pick ${plans} only when it ends.` },
          { question: "What happens after the free week?", answer: `Pick ${plans} to keep getting weekly schedules.` },
          { question: "Can I cancel?", answer: "Any time. You keep access until your paid week or month ends. No refunds for unused time." },
          { question: "Do I need 7Sage?", answer: "Yes for screenshots. You can also type your numbers by hand." },
          {
            question: "Is the plan made by AI?",
            answer: "No. Fixed rules built from the tutor's coaching method make the plan. AI only reads your screenshots, and you check what it read.",
          },
        ]}
      />
    </section>
  );
}

function PlanCard({ id, name, price, per, badge, children }: {
  id: string;
  name: string;
  price: string;
  per: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <article aria-labelledby={id} className="flex flex-col justify-between gap-8 rounded-md border border-vellum-line bg-paper p-8">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-y-2">
          <h3 id={id} className="text-h5 font-semibold text-ink">{name}</h3>
          {badge && (
            <span className="flex h-6 items-center rounded-pill bg-accent/tint px-2.5 text-caption font-medium text-accent">{badge}</span>
          )}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-h2 font-semibold tracking-heading text-ink">{price}</span>
          <span className="text-body text-smoke">{per}</span>
        </p>
        <p className="text-small text-smoke">{children}</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-small text-ink">{FREE_WEEK_NOTE}</p>
        <StartFreeWeekLink className="h-12 w-full" />
      </div>
    </article>
  );
}
