"use client";

import { useEffect, useRef } from "react";
import { StepScreen } from "@/components/landing/HowItWorksPin";
import { cx } from "@/components/ui/classes";
import { GridLabel } from "../grid/Grid";
import type { HowStep } from "./steps";

export const HOW_INTRO = "Four steps. The last one repeats every weekend.";

export function HowSection({ children }: { children: React.ReactNode }) {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="flex w-full scroll-mt-16 flex-col items-center">
      <GridLabel id="how-title" number="02">How it works</GridLabel>
      {children}
    </section>
  );
}

export function Reveal({ as: Tag = "li", className, children }: { as?: "li" | "div"; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || element.getBoundingClientRect().top < innerHeight * 0.85) return;
    element.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        element.dataset.reveal = "shown";
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

export function StepTitle({ step, index, className }: { step: HowStep; index: number; className?: string }) {
  return (
    <h3 className={cx("text-[24px]/[30px] font-semibold tracking-[-0.02em] text-ink md:text-[28px]/[34px]", className)}>
      <span className="text-fog tabular-nums">{index + 1} </span>
      {step.lead}
      <span className="how-mark">{step.key}</span>
    </h3>
  );
}

export function StepFrame({ step, className }: { step: HowStep; className: string }) {
  return (
    <div className="rounded-[16px] border border-paper/60 bg-[#F2F2F2] p-1.5 shadow-[0_18px_48px_rgb(11_11_11/0.16)]">
      <div className={cx("overflow-clip rounded-[10px] border border-[#D9D9D9] bg-paper", className)}>
        <CroppedScreen step={step} on="desktop" className="hidden md:block" />
        <CroppedScreen step={step} on="phone" className="md:hidden" />
      </div>
    </div>
  );
}

// Covers the frame like object-cover, after cutting `crop` source pixels off the top.
export function CroppedScreen({ step, on, alt, className }: { step: HowStep; on: "desktop" | "phone"; alt?: string; className?: string }) {
  const shot = on === "desktop" ? step.screen : step.phoneScreen;
  const crop = on === "desktop" ? step.crop.screen : step.crop.phone;
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
