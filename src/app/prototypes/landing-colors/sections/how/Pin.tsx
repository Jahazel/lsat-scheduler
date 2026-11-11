"use client";

import { useEffect, useRef, useState } from "react";
import { FOCUS } from "@/components/ui/classes";
import { CroppedScreen, HOW_INTRO, HowSection, Reveal, StepFrame, StepTitle } from "./parts";
import { STEPS, type HowStep } from "./steps";

type Copy = { steps?: HowStep[]; intro?: string };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const twoDigits = (value: number) => String(value).padStart(2, "0");

export function Pin({ steps = STEPS, intro = HOW_INTRO }: Copy) {
  return (
    <HowSection>
      <StackedSteps steps={steps} intro={intro} />
      <PinnedSteps steps={steps} intro={intro} />
    </HowSection>
  );
}

function StackedSteps({ steps, intro }: Required<Copy>) {
  return (
    <div className="flex w-full flex-col gap-10 pt-8 [@media(min-width:768px)_and_(min-height:800px)]:sr-only lg:sr-only">
      <Reveal as="div">
        <p className="how-in border-b border-dashed border-ink/14 pb-5 text-[15px]/[23px] text-smoke [--rise:12px]">{intro}</p>
      </Reveal>
      <ol className="flex flex-col gap-14">
        {steps.map((step, index) => (
          <Reveal key={step.key} className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <StepTitle step={step} index={index} className="how-in" />
              <p className="how-in text-[17px]/[27px] text-smoke [--d:80ms] [--rise:12px]">{step.body}</p>
            </div>
            <div className={`how-shade how-in how-pic rounded-[20px] p-4 [--d:140ms] [--rise:24px] how-shade-${index + 1}`}>
              <StepFrame step={step} className="h-[340px]" />
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function PinnedSteps({ steps, intro }: Required<Copy>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;
    const sync = () => {
      const trackBox = track.getBoundingClientRect();
      const pinBox = pin.getBoundingClientRect();
      const range = trackBox.height - pinBox.height;
      const progress = range > 0 ? clamp01((pinBox.top - trackBox.top) / range) : 0;
      fillRefs.current.forEach((fill, index) => {
        if (fill) fill.style.transform = `scaleX(${clamp01(progress * steps.length - index)})`;
      });
      setCurrent(Math.min(steps.length - 1, Math.floor(progress * steps.length)));
    };
    const measure = () => {
      track.style.setProperty("--pin-h", `${pin.offsetHeight}px`);
      sync();
    };
    const resizes = new ResizeObserver(measure);
    resizes.observe(pin);
    addEventListener("scroll", sync, { passive: true });
    addEventListener("resize", sync);
    return () => {
      resizes.disconnect();
      removeEventListener("scroll", sync);
      removeEventListener("resize", sync);
    };
  }, [steps.length]);

  function jumpTo(index: number) {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;
    const trackBox = track.getBoundingClientRect();
    const range = trackBox.height - pin.getBoundingClientRect().height;
    const pinnedTop = parseFloat(getComputedStyle(pin).top) || 0;
    scrollTo({
      top: trackBox.top + scrollY - pinnedTop + (index / steps.length) * range + 2,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  const stateOf = (index: number) => (index === current ? "on" : index < current ? "before" : "after");

  return (
    <div ref={trackRef} className="hidden w-full pt-14 [@media(min-width:768px)_and_(min-height:800px)]:block lg:block lg:pt-[72px]">
      <div
        ref={pinRef}
        className="sticky top-[max(80px,calc(32px+50vh-var(--pin-h,0px)/2))] mx-auto grid w-[min(720px,calc(100%-48px))] gap-8 lg:w-[min(1120px,calc(100%-48px))] lg:grid-cols-4 lg:items-center lg:gap-0"
      >
        <div className="flex min-w-0 flex-col lg:pl-6">
          <p className="mb-6 border-b border-dashed border-ink/14 pb-5 text-[14px]/[21px] text-smoke">{intro}</p>
          <p aria-hidden="true" className="mb-1 font-mono text-[12px]/[16px] tracking-[0.06em] text-fog uppercase tabular-nums">
            Step {twoDigits(current + 1)} / {twoDigits(steps.length)}
          </p>
          <div className="mb-2 flex gap-2">
            {steps.map(({ lead, key }, index) => (
              <button
                key={key}
                type="button"
                aria-label={`Go to step ${index + 1}: ${lead}${key}`}
                aria-current={index === current ? "step" : undefined}
                onClick={() => jumpTo(index)}
                className={`flex h-7 flex-1 cursor-pointer items-center ${FOCUS}`}
              >
                <span className="block h-[2px] w-full overflow-hidden rounded-pill bg-ink/10">
                  <span
                    ref={(fill) => {
                      fillRefs.current[index] = fill;
                    }}
                    className="block h-full origin-left bg-[#2B3B79] [transform:scaleX(0)]"
                  />
                </span>
              </button>
            ))}
          </div>
          <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)]">
            {steps.map(({ lead, key, body }, index) => (
              <div key={key} data-state={stateOf(index)} className="how-step flex flex-col gap-3 [grid-area:1/1]">
                <p className="text-[28px]/[34px] font-semibold tracking-[-0.02em] text-ink lg:text-[24px]/[30px] xl:text-[28px]/[34px]">
                  {lead}<span data-tone="abyss" className="how-key relative whitespace-nowrap">{key}</span>
                </p>
                <p className="text-[16px]/[25px] text-smoke">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="relative h-[420px] lg:col-span-3 lg:ml-6 lg:h-[min(500px,calc(100vh-220px))]">
          {steps.map(({ key }, index) => (
            <div key={key} data-state={stateOf(index)} className={`how-mat how-shade absolute inset-0 rounded-[24px] how-shade-${index + 1}`} />
          ))}
          {steps.map((step, index) => (
            <div key={step.key} data-state={stateOf(index)} className="how-shot absolute inset-6 lg:inset-8">
              <div className="size-full rounded-[16px] border border-paper/60 bg-[#F2F2F2] p-1.5 shadow-[0_18px_48px_rgb(11_11_11/0.16)]">
                <div className="size-full overflow-clip rounded-[10px] border border-[#D9D9D9] bg-paper">
                  <CroppedScreen step={step} on="desktop" alt="" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[120vh]" />
    </div>
  );
}
