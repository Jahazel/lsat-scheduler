"use client";

import { useEffect, useState } from "react";
import { FailureNotice } from "@/components/FailureNotice";
import { BAR, HEADER, Logo } from "@/components/nav/shared";
import { Button } from "@/components/ui/Button";
import { RoadToTest } from "./preview";
import { Columns } from "./columns";
import { WeekReveal } from "./reveal";
import type { NameCase, PlanState, RevealState } from "../view";
import { PlanChoice } from "./plan";
import { Check, DATA, Ring, STEPS, StepActions, StepBody, StepHeading, useFlow, type Bodies, type Cases, type Flow } from "./flow";

// Test data for the name cases in the brief; "there" is what onboarding says when Google gives no name.
const NAMES: Record<Exclude<NameCase, "data">, string> = { none: "there", one: "J", nonlatin: "美玲" };
// Stands in for the sign-out request before the server sends the Log in page.
const LOG_OUT_MS = 700;

export function TopBar({ beside, onLogOut }: { beside?: React.ReactNode; onLogOut?: () => void }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <header data-site-header="workspace" data-page-section className={HEADER}>
      <div className={BAR}>
        <div className="flex items-center gap-4">
          <Logo href="#" form="mark-below-md" />
          {beside}
        </div>
        <Button
          variant="text"
          size="md"
          waiting={leaving}
          className="shrink-0 whitespace-nowrap"
          onClick={() => {
            if (!onLogOut || leaving) return;
            setLeaving(true);
            setTimeout(onLogOut, LOG_OUT_MS);
          }}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}

const progress = (flow: Flow) => (flow.done ? 1 : (flow.index + 1) / STEPS.length);

function StepCount({ flow, size = 18 }: { flow: Flow; size?: number }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-small">
      {flow.done ? <Check className="size-[18px]" /> : <Ring value={progress(flow)} size={size} />}
      <span className="text-smoke">
        <span className="font-medium text-ink">{flow.atPlan ? "Last step" : flow.done ? "Done" : `Step ${flow.index + 1} of ${STEPS.length}`}</span>
        <span className="max-[359px]:sr-only"> · {flow.atPlan ? "Plan" : flow.done ? "Week reveal" : STEPS[flow.index].name}</span>
      </span>
    </span>
  );
}

type Props = { data?: keyof typeof DATA; name?: NameCase; bodies?: Bodies; startAt?: number; reveal?: RevealState; plan?: PlanState; cases?: Cases };

export function OnboardingPrototype({ data = "demo", name = "data", bodies, startAt = 0, reveal = "drills", plan = "first", cases }: Props) {
  const start = name === "data" ? DATA[data] : { ...DATA[data], firstName: NAMES[name] };
  const [flow, region, area] = useFlow(start, startAt, reveal, cases);
  const step = flow.atPlan ? 6 : flow.done ? 5 : flow.index + 1;
  useEffect(() => {
    parent.postMessage({ type: "at", at: { page: "onboarding", step, admin: flow.admin } }, location.origin);
  }, [step, flow.admin]);
  return (
    <div className="min-h-dvh bg-paper">
      <TopBar
        onLogOut={() => flow.cases.leave("login")}
        beside={(
          <span className="flex items-center gap-4">
            <span className="h-5 w-px bg-vellum-line" aria-hidden />
            <StepCount flow={flow} />
          </span>
        )}
      />
      <div ref={area} data-page-section>
        {flow.atPlan ? (
          <PlanChoice state={plan} data={data} onPay={() => flow.cases.leave("stripe")} />
        ) : flow.done ? (
          <WeekReveal flow={flow} />
        ) : (
          <Columns
            main={(
              <div ref={region} data-page-swap className="flex flex-col gap-8">
                <StepHeading flow={flow} />
                <StepBody flow={flow} bodies={bodies} />
              </div>
            )}
            actions={<StepActions flow={flow} />}
            aside={<RoadToTest flow={flow} />}
          />
        )}
      </div>
      <FailureNotice answer={flow.saveAnswer} />
    </div>
  );
}
