"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FOCUS } from "@/components/ui/classes";

export type Shot = { src: string; alt: string; width: number; height: number };
export type Step = { lead: string; key: string; body: string; tone: "violet" | "pink" | "amber" | "spectrum"; screen: Shot };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const twoDigits = (value: number) => String(value).padStart(2, "0");

export function HowItWorksPin({ steps }: { steps: Step[] }) {
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
    <div ref={trackRef} data-testid="how-track" className="hidden w-full pin:block">
      <div
        ref={pinRef}
        data-testid="how-pin"
        className="sticky top-[max(64px,calc(32px+50vh-var(--pin-h,0px)/2))] mx-auto grid w-[min(1120px,calc(100%-48px))] gap-10 md:max-w-[720px] lg:max-w-none px-6 py-8 lg:grid-cols-[400px_1fr] lg:items-start lg:gap-18 lg:py-12"
      >
        <div className="flex flex-col">
          <p className="mb-6 border-b border-dashed border-ink/14 pb-5 text-[15px]/[22px] text-smoke lg:mb-8 lg:pb-6">
            Four steps. The last one repeats every weekend.
          </p>
          <p aria-hidden="true" className="mb-3 font-mono text-[12px]/[16px] tracking-[0.06em] text-fog uppercase tabular-nums">
            Step {twoDigits(current + 1)} / {twoDigits(steps.length)}
          </p>
          <div aria-hidden="true" className="grid">
            {steps.map(({ lead, key, body, tone }, index) => (
              <div key={key} data-state={stateOf(index)} className="how-step flex flex-col gap-3 [grid-area:1/1]">
                <p className="text-[30px]/[38px] font-medium tracking-heading text-ink">
                  {lead}<span data-tone={tone} className="how-key relative whitespace-nowrap">{key}</span>
                </p>
                <p className="max-w-[380px] text-[17px]/[27px] text-smoke/90">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {steps.map(({ lead, key }, index) => (
              <button
                key={key}
                type="button"
                aria-label={`Go to step ${index + 1}: ${lead}${key}`}
                aria-current={index === current ? "step" : undefined}
                onClick={() => jumpTo(index)}
                className={`flex h-7 flex-1 cursor-pointer items-center ${FOCUS}`}
              >
                <span className="block h-[2px] w-full overflow-hidden rounded-pill bg-vellum-line">
                  <span
                    ref={(fill) => {
                      fillRefs.current[index] = fill;
                    }}
                    className="block h-full origin-left bg-ink [transform:scaleX(0)]"
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="relative h-[clamp(190px,100vh-458px,430px)] w-full lg:aspect-[624/400] lg:h-auto lg:w-[min(100%,624px,(100vh-256px)*1.56)] lg:justify-self-end"
        >
          {steps.map(({ key, tone }, index) => (
            <div key={key} data-state={stateOf(index)} className={`how-mat step-mat step-mat-${tone} absolute -inset-6 rounded-[28px] lg:-inset-10`} />
          ))}
          {steps.map(({ key, screen }, index) => (
            <div key={key} data-state={stateOf(index)} className="how-shot absolute inset-0 overflow-clip rounded-md bg-paper shadow-e2">
              <Image src={screen.src} alt="" width={screen.width} height={screen.height} sizes="(min-width: 1024px) 624px, 672px" loading="eager" className="size-full object-cover object-left-top" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-[248vh]" />
    </div>
  );
}
