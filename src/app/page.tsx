import { HeroScreens } from "@/components/landing/HeroScreens";
import { FREE_WEEK_NOTE, StartFreeWeekLink } from "@/components/landing/StartFreeWeekLink";
import { PLAN_PRICES, planPriceText } from "@/lib/planPrices";

const PROOF_NUMBERS = [
  { value: "178", label: "Tutor's LSAT score" },
  { value: "Stanford Law", label: "Tutor's law school" },
  { value: "200+", label: "Students coached" },
  { value: "3,000+", label: "Hours coached" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center overflow-x-clip bg-vellum px-5 md:px-0">
      <section aria-labelledby="landing-title" className="relative isolate flex w-full flex-col items-center pt-14 pb-[72px] md:pt-20 md:pb-0 lg:pt-24">
        <div className="flex w-full flex-col items-center gap-6 text-center md:max-w-[672px] lg:max-w-[880px]">
          <h1 id="landing-title" className="text-[40px]/[44px] font-semibold tracking-display text-balance text-ink md:text-h2 lg:text-h1">
            Your LSAT week, planned before Monday
          </h1>
          <p className="text-body text-smoke md:max-w-[560px] md:text-lead lg:max-w-[640px]">
            Upload your 7Sage analytics on the weekend. DrillMap plans Monday to Sunday around the question types you miss most.
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-[14px] pt-10 pb-14">
          <StartFreeWeekLink className="h-[52px] w-full px-7 md:w-auto" />
          <p className="text-small text-smoke">{FREE_WEEK_NOTE}</p>
        </div>

        <HeroScreens />

        <ul className="grid w-full grid-cols-2 gap-y-7 pt-14 md:max-w-[672px] md:gap-y-10 lg:flex lg:w-auto lg:max-w-none lg:divide-x lg:divide-vellum-line">
          {PROOF_NUMBERS.map(({ value, label }) => (
            <li key={value} className="flex flex-col gap-1 md:items-center md:px-8">
              <span className="text-h3 font-semibold tracking-heading whitespace-nowrap text-ink md:text-h2">{value}</span>
              <span className="text-small text-smoke">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works, id="how-it-works", goes here (#531). */}

      <PricingSection />

      {/* Questions go here (#532). */}

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
