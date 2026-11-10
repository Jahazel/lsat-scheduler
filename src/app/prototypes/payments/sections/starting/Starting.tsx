"use client";

import { ReadingBar } from "@/components/ui/ReadingBar";
import { useEffect, useState } from "react";
import { FOCUS, cx } from "@/components/ui/classes";
import { SKELETON } from "@/app/onboarding/shell";
import { AppChrome, OnboardingChrome } from "../../chrome";
import { goToScreen, useProtoState } from "../../protoContext";
import { PreviewPanel } from "../../protoParts";
import { UploadColumn } from "../restart/upload";

const TITLE = "Starting your plan…";
const CONFIRM_MS = 4000;

export default function Starting() {
  const state = useProtoState() || "waiting";
  if (state === "lapsed-waiting") {
    return (
      <AppChrome>
        <UploadColumn>
          <Waiting lead="Stripe is confirming your card. Your weekly upload opens next." slow={false} next={["restart", "upload"]} />
        </UploadColumn>
      </AppChrome>
    );
  }
  return (
    <OnboardingChrome preview={<NextWeek />}>
      <Waiting lead="Stripe is confirming your card. This week opens next." slow={state === "slow"} next={["this-week", "free-start"]} />
    </OnboardingChrome>
  );
}

/** The app's Loop: the reading bar's sliding segment, with no percent, because Stripe gives no progress. */
function Waiting({ lead, slow: startsSlow, next }: { lead: string; slow: boolean; next: [string, string] }) {
  const [slow, setSlow] = useState(startsSlow);
  // Stripe confirms in a few seconds in the prototype; the slow state waits until the student taps "Try again".
  useEffect(() => {
    if (slow) return;
    const timer = setTimeout(() => goToScreen(...next), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [slow, next]);
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <h1 className="text-h3 font-semibold text-ink">{TITLE}</h1>
      <p className="text-body text-smoke">{lead}</p>
      <ReadingBar label="Starting your plan" phase="reading" longRead={false} />
      {slow && (
        <p className="reading-note mt-2 text-small text-smoke">
          This is taking longer than usual.{" "}
          <button type="button" className={cx("-my-3 py-3 touch-manipulation select-none rounded-xs font-medium text-accent hover:underline", FOCUS)} onClick={() => setSlow(false)}>Try again</button>
        </p>
      )}
    </div>
  );
}

function NextWeek() {
  return (
    <PreviewPanel label="What happens next">
      <p className="font-mono text-label uppercase text-smoke">Next · This week</p>
      <div className="flex max-w-[520px] flex-col gap-5 rounded-tl-sm bg-paper p-8 shadow-e2">
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
    </PreviewPanel>
  );
}
