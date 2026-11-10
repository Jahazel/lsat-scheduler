"use client";

import { useState } from "react";
import { DropZone } from "@/components/ui/DropZone";
import { AppChrome } from "../../chrome";
import { useProtoData, useProtoState } from "../../protoContext";
import { plansFor, type PlanName } from "../../protoData";
import { PlanFoot, StepTitle } from "../../protoParts";
import { PlanNotice } from "../notes/PlanNotice";
import { PlanCards, Row, StripePreview } from "../PlanChoice";
import { UploadColumn } from "./upload";

/** Plan choice in place of the weekly upload for a lapsed student: no free week, the charge is today. */
export default function RestartChoice() {
  const data = useProtoData();
  const state = useProtoState();
  const noCard = state === "no-card";
  const plans = plansFor(data.prices);
  const [plan, setPlan] = useState<PlanName>(noCard ? data.plan : "weekly");
  const picked = plans[plan];
  const renews = plan === "weekly" ? data.restart.weeklyRenews : data.restart.monthlyRenews;
  if (state === "upload") return <UploadOpens />;
  return (
    <AppChrome>
      <UploadColumn
        aside={<StripePreview name={picked.name} headline={`${picked.price} today`} then={`Then ${picked.price} ${picked.per} starting ${renews}`} changes={plan} />}
      >
        {noCard && <PlanNotice note={{ tone: "info", lead: "You didn't add a card.", rest: "Pick a plan to continue." }} label="Checkout" glyph={false} />}
        <StepTitle title="Pick a plan" lead="Your weekly schedules are paused. A new plan starts today, and your weekly upload opens right after." />
        <PlanCards plans={plans} plan={plan} onPick={setPlan} />
        <dl className="flex flex-col border-y border-vellum-line text-small">
          <Row term="Today" value={picked.price} changes={plan} />
          <Row term="Renews" value={<span className="whitespace-nowrap">{renews}</span>} changes={plan} />
        </dl>
        <PlanFoot every={picked.every} checkout="checkout-lapsed" />
      </UploadColumn>
    </AppChrome>
  );
}

/** After the plan starts, the weekly upload opens as it does today; a sketch of its first part shows where the student lands. */
function UploadOpens() {
  return (
    <AppChrome>
      <UploadColumn>
        <StepTitle title="Plan this week" lead="Add your analytics screenshots to build this week's schedule." />
        <DropZone label="Add your analytics screenshots" multiple onFiles={() => {}} />
      </UploadColumn>
    </AppChrome>
  );
}
