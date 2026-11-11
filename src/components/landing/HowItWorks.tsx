import { CroppedScreen, HowItWorksPin, RevealStep, StepFrame, type Step } from "./HowItWorksPin";
import { SectionLabel } from "./LineGrid";

const INTRO = "Four steps. The last one repeats every weekend.";

const STEPS: Step[] = [
  {
    lead: "Tell us about ",
    key: "your prep",
    body: "Your scores, your study hours, and your goal test date.",
    screen: { src: "/landing/step-1-prep.png", alt: "Set your target screen: current PT score, goal score, goal test date and test time", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-1-prep-phone.png", alt: "Plan your week screen: study time for each day", width: 780, height: 956 },
    labelHeight: { screen: 123, phone: 127 },
  },
  {
    lead: "Upload your ",
    key: "practice analytics",
    body: "Two screenshots. You check every number we read before we save it. You can also type them by hand.",
    screen: { src: "/landing/step-2-check.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-2-check-phone.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 780, height: 956 },
    labelHeight: { screen: 157, phone: 126 },
  },
  {
    lead: "Get ",
    key: "your week",
    body: "A Monday–Sunday plan aimed at your weakest question types. Check off each drill as you go.",
    screen: { src: "/landing/step-3-week.png", alt: "This week screen: Saturday and Sunday drills with check boxes", width: 1560, height: 1000 },
    phoneScreen: { src: "/landing/step-3-week-phone.png", alt: "This week screen: Saturday drills with check boxes", width: 780, height: 489 },
    labelHeight: { screen: 58, phone: 0 },
  },
  {
    lead: "Repeat ",
    key: "every weekend",
    body: "Upload new analytics. Next week's plan adjusts to what changed.",
    screen: { src: "/landing/step-4-repeat.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 1356, height: 870 },
    phoneScreen: { src: "/landing/step-4-repeat-phone.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 780, height: 956 },
    labelHeight: { screen: 128, phone: 81 },
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="flex w-full scroll-mt-16 flex-col items-center">
      <SectionLabel id="how-title" number="02">How it works</SectionLabel>
      <div className="flex w-full flex-col gap-10 pt-8 md:w-[min(720px,calc(100%-48px))] pin:sr-only">
        <RevealStep as="div" shownOnJump>
          <p className="how-in border-b border-dashed border-ink/14 pb-5 text-[15px]/[23px] text-smoke [--rise:12px]">{INTRO}</p>
        </RevealStep>
        <ol className="flex flex-col gap-14">
          {STEPS.map((step, index) => (
            <RevealStep key={step.key} shownOnJump={index === 0} className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="how-in text-[24px]/[30px] font-semibold tracking-heading text-ink md:text-h3">
                  <span className="text-fog tabular-nums">{index + 1} </span>
                  {step.lead}
                  <span className="how-key">{step.key}</span>
                </h3>
                <p className="how-in text-[17px]/[27px] text-smoke [--d:80ms] [--rise:12px]">{step.body}</p>
              </div>
              <div className={`how-in how-pic how-shade-${index + 1} rounded-[20px] p-4 [--d:140ms] [--rise:24px]`}>
                <StepFrame className="h-[354px]">
                  <CroppedScreen step={step} on="desktop" className="hidden md:block" />
                  <CroppedScreen step={step} on="phone" className="md:hidden" />
                </StepFrame>
              </div>
            </RevealStep>
          ))}
        </ol>
      </div>
      <HowItWorksPin steps={STEPS} intro={INTRO} />
    </section>
  );
}
