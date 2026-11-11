"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageCue } from "@/components/SiteMotion";
import { ReadingBar } from "@/components/ui/ReadingBar";
import { FOCUS, cx } from "@/components/ui/classes";
import { callAction } from "@/lib/callAction";
import type { Answer } from "@/lib/unexpectedFailure";
import { ONBOARDING_COLUMN, ONBOARDING_GRID, SKELETON } from "./shell";

export const ASK_EVERY_MS = 2_000;
export const SLOW_AFTER_MS = 20_000;

export default function StartingPlan({ hasPlanStarted }: { hasPlanStarted: () => Promise<Answer<boolean>> }) {
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
      if (started === true) return router.push("/dashboard");
      if (Date.now() - startedAt >= SLOW_AFTER_MS) return setSlow(true);
      timer = setTimeout(ask, ASK_EVERY_MS);
    }
    timer = setTimeout(ask, ASK_EVERY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [hasPlanStarted, round, router]);

  function tryAgain() {
    setSlow(false);
    setRound((count) => count + 1);
  }

  return (
    <div className={cx(ONBOARDING_GRID, "bg-paper")}>
      <PageCue page="onboarding" />
      <div className={ONBOARDING_COLUMN}>
        <div data-page-swap data-page-section className="w-full lg:max-w-[440px]">
          <p className="mb-2 font-mono text-label uppercase text-smoke">Step 5 of 5 · Plan</p>
          <div aria-live="polite" className="flex flex-col gap-2">
            <h1 className="text-h3 font-semibold text-ink">Starting your plan…</h1>
            <p className="text-body text-smoke">Stripe is confirming your card. This week opens next.</p>
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
        </div>
      </div>
      <aside data-page-section aria-label="What happens next" className="hidden flex-col gap-4 bg-vellum px-8 pt-32 pb-12 lg:flex xl:px-18">
        <p className="font-mono text-label uppercase text-smoke">Next · This week</p>
        <div aria-hidden className="flex max-w-[520px] flex-col gap-5 rounded-tl-sm bg-paper p-8 shadow-e2">
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
      </aside>
    </div>
  );
}
