import Image from "next/image";
import { SectionLabel } from "./SectionGrid";
import { StepScreenReveal } from "./StepScreenReveal";

type Shot = { src: string; alt: string; width: number; height: number };

const STEPS: { title: string; body: string; mat: string; screen: Shot; phoneScreen: Shot }[] = [
  {
    title: "Tell us about your prep",
    body: "Your scores, your study hours, and your goal test date.",
    mat: "step-mat-violet",
    screen: { src: "/landing/step-1-prep.png", alt: "Set your target screen: current PT score, goal score, goal test date and test time", width: 678, height: 435 },
    phoneScreen: { src: "/landing/step-1-prep-phone.png", alt: "Plan your week screen: study time for each day", width: 780, height: 956 },
  },
  {
    title: "Upload your 7Sage analytics",
    body: "Two screenshots. You check every number we read before we save it. You can also type them by hand.",
    mat: "step-mat-pink",
    screen: { src: "/landing/step-2-check.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 678, height: 435 },
    phoneScreen: { src: "/landing/step-2-check-phone.png", alt: "Check what we read screen: each value read from your 7Sage screenshots, ready to edit", width: 780, height: 956 },
  },
  {
    title: "Get your week",
    body: "A Monday–Sunday plan aimed at your weakest question types. Check off each drill as you go.",
    mat: "step-mat-amber",
    screen: { src: "/landing/step-3-week.png", alt: "This week screen: Saturday and Sunday drills with check boxes", width: 780, height: 500 },
    phoneScreen: { src: "/landing/step-3-week-phone.png", alt: "This week screen: Saturday drills with check boxes", width: 780, height: 489 },
  },
  {
    title: "Repeat every weekend",
    body: "Upload new analytics. Next week's plan adjusts to what changed.",
    mat: "step-mat-spectrum",
    screen: { src: "/landing/step-4-repeat.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 678, height: 435 },
    phoneScreen: { src: "/landing/step-4-repeat-phone.png", alt: "Plan next week screen: current score and the 7Sage screenshot upload", width: 780, height: 956 },
  },
];

const SHOT_IMAGE = "size-full object-cover object-left-top";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="flex w-full scroll-mt-16 flex-col items-center"
    >
      <SectionLabel id="how-title" number="02">How it works</SectionLabel>
      <div className="flex w-full flex-col items-center gap-10 pt-8 md:w-[720px] md:gap-14 md:pt-14 lg:w-[min(1120px,calc(100%-48px))] lg:gap-24 lg:pt-[72px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[32px]/[38px] font-semibold tracking-heading text-ink md:text-h2">How it works</p>
          <p className="text-body text-smoke md:max-w-[600px] md:text-lead">
            Four steps. The last one repeats every weekend, so each new plan starts from your latest results.
          </p>
        </div>
        <ol className="flex w-full flex-col gap-5 md:gap-8 lg:gap-[120px]">
          {STEPS.map(({ title, body, mat, screen, phoneScreen }, index) => (
            <li
              key={title}
              className="relative isolate flex flex-col gap-6 px-5 pt-7 pb-5 md:gap-8 md:px-12 md:pt-10 md:pb-12 lg:flex-row lg:items-center lg:gap-24 lg:p-0 lg:even:flex-row-reverse"
            >
              <div className="relative flex min-w-0 flex-col gap-4 md:max-w-[560px] lg:w-[400px]">
                <h3 className="text-h4 font-semibold tracking-heading text-ink md:text-h3">
                  <span className="text-smoke">{index + 1} </span>{title}
                </h3>
                <p className="text-body text-smoke md:text-lead">{body}</p>
              </div>
              <div className="lg:relative lg:shrink-0">
                <div aria-hidden="true" className={`step-mat ${mat} absolute inset-0 -z-10 rounded-lg md:rounded-[24px] lg:-inset-10`} />
                <StepScreenReveal className="relative h-[380px] w-full overflow-clip rounded-md bg-paper shadow-e2 md:h-[400px] md:w-[624px]">
                  <Image src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} sizes="624px" className={`${SHOT_IMAGE} hidden md:block`} />
                  <Image src={phoneScreen.src} alt={phoneScreen.alt} width={phoneScreen.width} height={phoneScreen.height} sizes="100vw" className={`${SHOT_IMAGE} md:hidden`} />
                </StepScreenReveal>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
