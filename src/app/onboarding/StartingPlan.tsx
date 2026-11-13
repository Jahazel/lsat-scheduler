"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReadingBar } from "@/components/ui/ReadingBar";
import { FOCUS, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import { PLAN_CHOICE_PATHS, type PlanChoicePlace } from "@/lib/planChoice";
import type { Answer } from "@/lib/unexpectedFailure";
import { PlanShell } from "./PlanShell";
import { SKELETON } from "./shell";

export const ASK_EVERY_MS = 2_000;
export const SLOW_AFTER_MS = 20_000;

const NEXT: Record<PlanChoicePlace, { path: string; lead: string }> = {
  onboarding: { path: "/dashboard", lead: "Stripe is confirming your card. This week opens next." },
  weekly_upload: { path: PLAN_CHOICE_PATHS.weekly_upload, lead: "Stripe is confirming your card. Your weekly upload opens next." },
};

export default function StartingPlan({ place, hasPlanStarted }: { place: PlanChoicePlace; hasPlanStarted: () => Promise<Answer<boolean>> }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    async function ask() {
      const started = await callAction(hasPlanStarted)().catch(() => false);
      if (stopped) return;
      if (started === true) {
        router.push(NEXT[place].path);
        return router.refresh();
      }
      if (Date.now() - startedAt >= SLOW_AFTER_MS) return setSlow(true);
      timer = setTimeout(ask, ASK_EVERY_MS);
    }
    timer = setTimeout(ask, ASK_EVERY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [hasPlanStarted, place, round, router]);

  function tryAgain() {
    setSlow(false);
    setRound((count) => count + 1);
  }

  return (
    <PlanShell place={place} aside={place === "onboarding" && <NextWeekSketch />}>
      <div aria-live="polite" className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold text-ink">Starting your plan…</h1>
        <p className="text-body text-smoke">{NEXT[place].lead}</p>
        <ReadingBar label="Starting your plan" phase="reading" longRead={false} />
        {slow && (
          <p className="reading-note mt-2 text-small text-smoke">
            This is taking longer than usual.{" "}
            <button
              type="button"
              onClick={tryAgain}
              className={cx("-my-3 touch-manipulation select-none rounded-xs py-3 font-medium text-accent hover:underline", FOCUS)}
            >
              Try again
            </button>
          </p>
        )}
      </div>
    </PlanShell>
  );
}

function NextWeekSketch() {
  return (
    <div className="flex flex-col gap-6 rounded-lg bg-paper p-8 shadow-e1">
      <p className="text-small text-smoke">Next · This week</p>
      <div aria-hidden className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={cx(SKELETON, "w-24")} />
          <span className="h-4 w-56 rounded bg-vellum-line" />
        </div>
        {[0, 1, 2].map((day) => (
          <div key={day} className="flex flex-col gap-3 rounded-sm border border-vellum-line p-4">
            <span className={cx(SKELETON, "w-20")} />
            <span className={cx(SKELETON, "w-full")} />
            <span className={cx(SKELETON, "w-2/3")} />
          </div>
        ))}
      </div>
    </div>
  );
}
