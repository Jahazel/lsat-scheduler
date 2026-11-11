import { isPlanName, planChoiceOffer, type PlanChoicePlace } from "@/lib/planChoice";
import { PLAN_PRICES } from "@/lib/planPrices";
import PlanChoice from "./PlanChoice";
import StartingPlan from "./StartingPlan";
import { hasPlanStarted, openStripeCheckout } from "./actions";

export type PlanChoiceSearchParams = { checkout?: string | string[]; plan?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function PlanChoiceScreen({ place, freeWeekEndsAt, realNow, searchParams }: {
  place: PlanChoicePlace;
  freeWeekEndsAt: Date | null;
  realNow: Date;
  searchParams: PlanChoiceSearchParams;
}) {
  const checkout = first(searchParams.checkout);
  if (checkout === "done") return <StartingPlan place={place} hasPlanStarted={hasPlanStarted} />;
  const returnedPlan = first(searchParams.plan);
  return (
    <PlanChoice
      place={place}
      offer={planChoiceOffer(PLAN_PRICES, freeWeekEndsAt, realNow)}
      cameBackWithoutCard={checkout === "closed"}
      initialPlan={isPlanName(returnedPlan) ? returnedPlan : "weekly"}
      openCheckout={openStripeCheckout}
    />
  );
}
