"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FOCUS, cx } from "@/components/ui/classes";

export type Shot = { src: string; alt: string; width: number; height: number };
export type Step = { lead: string; key: string; body: string; screen: Shot; phoneScreen: Shot; labelHeight: { screen: number; phone: number } };

export const PIN_MEDIA = "(min-width: 1024px), (min-width: 768px) and (min-height: 800px)";

const HIDDEN_WIDTHS = { desktop: "not all and (min-width: 768px)", phone: "(min-width: 768px)" };
const NO_DOWNLOAD_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function StepScreen({ shot, alt = shot.alt, on, className }: { shot: Shot; alt?: string; on: "phone" | "desktop"; className: string }) {
  return (
    <picture>
      <source media={HIDDEN_WIDTHS[on]} srcSet={NO_DOWNLOAD_SRC} />
      <Image src={shot.src} alt={alt} width={shot.width} height={shot.height} sizes={on === "desktop" ? "(min-width: 1024px) 760px, 720px" : "100vw"} loading="eager" className={className} />
    </picture>
  );
}

export function CroppedScreen({ step, on, alt, className }: { step: Step; on: "desktop" | "phone"; alt?: string; className?: string }) {
  const shot = on === "desktop" ? step.screen : step.phoneScreen;
  const crop = on === "desktop" ? step.labelHeight.screen : step.labelHeight.phone;
  const vars = { "--crop": crop / shot.height, "--ratio": shot.width / (shot.height - crop) } as React.CSSProperties;
  return (
    <div style={vars} className={cx("size-full overflow-clip [container-type:size]", className)}>
      <StepScreen
        shot={shot}
        alt={alt}
        on={on}
        className="h-auto w-[max(100cqw,calc(100cqh*var(--ratio)))] max-w-none [transform:translateY(calc(var(--crop)*-100%))]"
      />
    </div>
  );
}

export function RevealStep({ as: Tag = "li", shownOnJump = false, className, children }: { as?: "li" | "div"; shownOnJump?: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLLIElement & HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || matchMedia(PIN_MEDIA).matches || element.getBoundingClientRect().top < innerHeight * 0.85) return;
    element.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        stop();
        element.dataset.reveal = "shown";
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    const showOnJump = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link?.hash !== "#how-it-works" || link.pathname !== location.pathname) return;
      stop();
      delete element.dataset.reveal;
    };
    const stop = () => {
      observer.disconnect();
      document.removeEventListener("click", showOnJump);
    };
    observer.observe(element);
    if (shownOnJump) document.addEventListener("click", showOnJump);
    return stop;
  }, [shownOnJump]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const twoDigits = (value: number) => String(value).padStart(2, "0");

export function HowItWorksPin({ steps, intro }: { steps: Step[]; intro: string }) {
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
    <div ref={trackRef} data-testid="how-track" className="hidden w-full pt-14 pin:block lg:pt-[72px]">
      <div
        ref={pinRef}
        data-testid="how-pin"
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
                    className="block h-full origin-left bg-abyss-blue [transform:scaleX(0)]"
                  />
                </span>
              </button>
            ))}
          </div>
          <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)]">
            {steps.map(({ lead, key, body }, index) => (
              <div key={key} data-state={stateOf(index)} className="how-step flex flex-col gap-3 [grid-area:1/1]">
                <p className="text-h3 font-semibold tracking-heading text-ink lg:text-[24px]/[30px] min-[1280px]:text-h3">
                  {lead}<span className="how-key">{key}</span>
                </p>
                <p className="text-[16px]/[25px] text-smoke">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="relative h-[420px] lg:col-span-3 lg:ml-6 lg:h-[min(500px,calc(100vh-220px))]">
          {steps.map(({ key }, index) => (
            <div key={key} data-state={stateOf(index)} className={`how-mat how-shade-${index + 1} absolute inset-0 rounded-[24px]`} />
          ))}
          {steps.map((step, index) => (
            <div key={step.key} data-state={stateOf(index)} className="how-shot absolute inset-6 lg:inset-8">
              <StepFrame className="size-full">
                <CroppedScreen step={step} on="desktop" alt="" />
              </StepFrame>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[120vh]" />
    </div>
  );
}

export function StepFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("rounded-[16px] border border-paper/60 bg-vellum p-1.5 shadow-step-screen", className)}>
      <div className="size-full overflow-clip rounded-[10px] border border-silver-mist bg-paper">{children}</div>
    </div>
  );
}
