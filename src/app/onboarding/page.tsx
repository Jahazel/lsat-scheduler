import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageArrival } from "@/components/PagePlaceholder";
import { isAdminUser } from "@/lib/accessControl";
import { isPlanName, planChoiceOffer } from "@/lib/planChoice";
import { PLAN_PRICES } from "@/lib/planPrices";
import { readScanningOff } from "@/lib/scanSpending";
import { planChoiceStanding } from "@/lib/stripeCheckout";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { initialsFor } from "@/lib/studentNav";
import { findStudentByAccountId } from "@/lib/studentRepository";
import OnboardingWizard from "./OnboardingWizard";
import PlanChoice from "./PlanChoice";
import StartingPlan from "./StartingPlan";
import { createStudentProfile, hasPlanStarted, openStripeCheckout } from "./actions";

type OnboardingSearchParams = { checkout?: string | string[]; plan?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<OnboardingSearchParams> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const existing = await findStudentByAccountId(session.user.id);
  if (existing) {
    const realNow = new Date();
    const standing = await planChoiceStanding(session.user.id, realNow);
    if (standing.kind !== "choose") redirect("/dashboard");
    const { checkout, plan } = await searchParams;
    if (first(checkout) === "done") {
      return (
        <div>
          <StartingPlan hasPlanStarted={hasPlanStarted} />
          <PageArrival page="Onboarding" />
        </div>
      );
    }
    const returnedPlan = first(plan);
    return (
      <div>
        <PlanChoice
          offer={planChoiceOffer(PLAN_PRICES, standing.freeWeekEndsAt, realNow)}
          cameBackWithoutCard={first(checkout) === "closed"}
          initialPlan={isPlanName(returnedPlan) ? returnedPlan : "weekly"}
          openCheckout={openStripeCheckout}
        />
        <PageArrival page="Onboarding" />
      </div>
    );
  }

  const today = await studentSideToday(session.user);
  return (
    <div>
      <OnboardingWizard
        firstName={session.user.name?.trim().split(/\s+/)[0] || "there"}
        initials={initialsFor(session.user.name, session.user.email)}
        today={today}
        goalTestDateOptions={upcomingTestMonths(today)}
        scanningOff={(await readScanningOff(new Date())).analytics}
        withPlanStep={!isAdminUser(session.user)}
        onSave={createStudentProfile}
      />
      <PageArrival page="Onboarding" />
    </div>
  );
}
