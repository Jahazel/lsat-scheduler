"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { stepPlace, type WizardStep } from "@/lib/onboardingWizard";

type CountedStep = WizardStep | "reveal" | "plan";

let topBarStep: CountedStep | null = null;
const listeners = new Set<() => void>();

function setTopBarStep(step: CountedStep | null) {
  topBarStep = step;
  for (const listener of listeners) listener();
}

function subscribeToTopBarStep(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function Ring({ share }: { share: number }) {
  const size = 18;
  const r = (size - 3) / 2;
  const length = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-vellum-line" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-accent transition-[stroke-dashoffset] duration-(--duration-base) ease-(--ease-out-strong) motion-reduce:transition-none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - share)}
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width={18} height={18} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="10" className="fill-accent" />
      <path d="m6 10.2 2.6 2.6L14 7.4" fill="none" className="stroke-paper" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function stepLabel(step: CountedStep) {
  if (step === "reveal") return { lead: "Done", name: "Week reveal", share: null };
  if (step === "plan") return { lead: "Last step", name: "Plan", share: null };
  const place = stepPlace(step);
  return { lead: `Step ${place.number} of ${place.of}`, name: place.name, share: place.number / place.of };
}

function Count({ step }: { step: CountedStep }) {
  const { lead, name, share } = stepLabel(step);
  return (
    <p className="flex items-center gap-2 whitespace-nowrap text-small text-smoke">
      {share === null ? <Check /> : <Ring share={share} />}
      <span>
        <span className="font-medium text-ink">{lead}</span>
        <span className="max-[360px]:sr-only">{` · ${name}`}</span>
      </span>
    </p>
  );
}

export function TopBarStepCount({ first }: { first: CountedStep }) {
  const step = useSyncExternalStore(subscribeToTopBarStep, () => topBarStep ?? first, () => first);
  if (usePathname() !== "/onboarding") return null;
  return (
    <span className="flex items-center gap-4">
      <span aria-hidden className="h-5 w-px bg-vellum-line" />
      <Count step={step} />
    </span>
  );
}

export function StepCount({ step, aboveQuestions = false }: { step: CountedStep; aboveQuestions?: boolean }) {
  useLayoutEffect(() => {
    setTopBarStep(step);
    return () => setTopBarStep(null);
  }, [step]);
  return aboveQuestions ? <div className="px-5 pt-6 md:px-10"><Count step={step} /></div> : null;
}
