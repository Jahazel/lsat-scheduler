"use client";

import { GapBand, SectionGrid, SectionLabel } from "@/components/landing/SectionGrid";
import { StartFreeWeekLink } from "@/components/landing/StartFreeWeekLink";
import { cx } from "@/components/ui/classes";
import { useProtoData } from "../../protoContext";
import { plansFor, TERMS } from "../../protoData";

const RULE = "border-dashed border-ink/14";
const WIDTH = "w-full md:w-[min(720px,calc(100%-48px))] lg:w-[min(1120px,calc(100%-48px))]";

export const FREE_WEEK_NOTE = "Your first full week free. Cancel before it ends and pay nothing.";

/** Every landing line that talks about the card or the free week, in the landing page's own styles, with the new wording. */
export default function LandingWording() {
  const plans = plansFor(useProtoData().prices);
  const both = `Weekly (${plans.weekly.price}) or Monthly (${plans.monthly.price})`;
  const questions = [
    { question: "Can I cancel?", answer: "Any time. You keep access until your paid week or month ends. No refunds for any unused time." },
    {
      question: "Do I need a card to start?",
      answer: "Yes. You add a card when you pick a plan at the end of setup. You pay nothing until your free week ends, and you can cancel any time before then.",
    },
    {
      question: "What happens after the free week?",
      answer: `The plan you picked starts on its own: ${both}. Your weekly schedules keep coming. Cancel before the free week ends and you pay nothing.`,
    },
  ];
  return (
    <div className="flex flex-col items-center overflow-x-clip bg-vellum px-5 md:px-0">
      <section aria-label="Hero" className="flex w-full flex-col items-center gap-3 pt-16 pb-14 text-center md:gap-[14px] md:pt-24">
        <p className="max-w-[640px] text-[34px]/[40px] font-semibold tracking-[-0.03em] text-balance text-ink md:text-[44px]/[50px]">
          Your practice results, turned into next week&apos;s plan
        </p>
        <StartFreeWeekLink className="mt-4 h-[52px] w-full px-7 md:w-auto" />
        <p className="text-small text-smoke">{FREE_WEEK_NOTE}</p>
      </section>

      <SectionGrid>
        <section aria-labelledby="pricing-title" className="flex w-full flex-col items-center">
          <SectionLabel id="pricing-title" number="03">Pricing</SectionLabel>
          <div className={WIDTH}>
            <div className="grid gap-5 pt-8 pb-7 md:pt-14 md:pb-10 lg:grid-cols-2 lg:items-end lg:gap-0 lg:px-6 lg:pt-[72px] lg:pb-14">
              <p className="max-w-[480px] text-[32px]/[38px] font-semibold tracking-[-0.03em] text-balance text-ink md:text-[40px]/[46px] lg:text-[48px]/[54px]">
                Your first full week is free
              </p>
              <p className="max-w-[400px] text-[17px]/[27px] text-smoke lg:pl-6">
                Pick a plan at the end of setup. You pay nothing until your free week ends. Both plans get the same weekly schedule.
              </p>
            </div>
            <div className={`grid gap-3 md:grid-cols-2 md:gap-0 md:border-y ${RULE}`}>
              {[plans.weekly, plans.monthly].map((plan) => (
                <article key={plan.name} className="flex md:p-4 lg:p-6">
                  <div className="flex flex-1 flex-col gap-3 rounded-[14px] border border-vellum-line bg-paper p-6 lg:p-8">
                    <h3 className="font-mono text-caption tracking-[0.06em] text-smoke uppercase">{plan.name}</h3>
                    <p className="flex flex-wrap items-baseline gap-x-2 pt-2">
                      <span className="text-[48px]/[52px] font-semibold tracking-[-0.04em] text-ink tabular-nums lg:text-[56px]/[60px]">{plan.price}</span>
                      <span className="text-[17px] text-smoke">{plan.per}</span>
                    </p>
                    <div className={`mt-6 flex flex-col gap-[14px] border-t pt-6 ${RULE}`}>
                      <p className="text-small text-ink">{FREE_WEEK_NOTE}</p>
                      <StartFreeWeekLink className="h-12 w-full" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="pt-5 text-small text-smoke lg:px-6">{TERMS}</p>
          </div>
        </section>
        <GapBand />
        <section aria-labelledby="questions-title" className="flex w-full flex-col items-center">
          <SectionLabel id="questions-title" number="04">FAQ</SectionLabel>
          <ul className={cx("mt-8 border-t md:mt-14", RULE, WIDTH)}>
            {questions.map(({ question, answer }) => (
              <li key={question} className={cx("flex flex-col gap-2 border-b py-5 md:py-[22px] lg:p-6", RULE)}>
                <h3 className="text-[17px]/[24px] font-medium tracking-[-0.01em] text-ink md:text-[18px]/[26px] lg:text-[20px]/[28px]">{question}</h3>
                <p className="max-w-[720px] text-[15px]/[24px] text-smoke md:text-[17px]/[27px]">{answer}</p>
              </li>
            ))}
          </ul>
        </section>
        <GapBand />
        <section aria-labelledby="closing-title" className="flex w-full flex-col items-center pb-16">
          <SectionLabel id="closing-title" number="05">Start</SectionLabel>
          <div className={cx("grid gap-10 pt-14 md:grid-cols-2", WIDTH)}>
            <div className="flex flex-col items-start gap-5 lg:px-6">
              <p className="text-[17px]/[27px] text-smoke">{FREE_WEEK_NOTE}</p>
              <StartFreeWeekLink arrow className="h-12 w-full gap-1.5 px-[22px] md:w-auto" />
            </div>
            <div className="flex flex-col items-start gap-2 md:pr-6 lg:pl-6">
              <h3 className="text-[16px]/[22px] font-semibold text-ink">See what you&apos;ll pay</h3>
              <p className="text-[15px]/[23px] text-smoke">{both}. Pick one at the end of setup.</p>
            </div>
          </div>
        </section>
      </SectionGrid>
    </div>
  );
}
