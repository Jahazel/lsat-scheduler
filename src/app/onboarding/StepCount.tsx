"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TOP_BAR_STEP_SLOT } from "@/components/nav/shared";
import { stepPlace, type WizardStep } from "@/lib/onboardingWizard";

const noSubscription = () => () => {};

function useTopBarSlot() {
  return useSyncExternalStore(noSubscription, () => document.getElementById(TOP_BAR_STEP_SLOT), () => undefined);
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

export function StepCount({ step }: { step: WizardStep }) {
  const slot = useTopBarSlot();
  const place = stepPlace(step);
  const count = (
    <p className="flex items-center gap-2 whitespace-nowrap text-small text-smoke">
      <Ring share={place.number / place.of} />
      <span>
        <span className="font-medium text-ink">{`Step ${place.number} of ${place.of}`}</span>
        <span className="max-[360px]:sr-only">{` · ${place.name}`}</span>
      </span>
    </p>
  );
  if (slot === undefined) return null;
  if (!slot) return <div className="px-5 pt-6 md:px-10">{count}</div>;
  return createPortal(
    <span className="flex items-center gap-4">
      <span aria-hidden className="h-5 w-px bg-vellum-line" />
      {count}
    </span>,
    slot,
  );
}
