import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/accessControl";
import { PageArrival } from "@/components/PagePlaceholder";
import { PLAN_CHOICE_PATHS } from "@/lib/planChoice";
import { readScanningOff } from "@/lib/scanSpending";
import { planChoiceStanding } from "@/lib/stripeCheckout";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { findStudentByAccountId } from "@/lib/studentRepository";
import OnboardingWizard from "./OnboardingWizard";
import { PlanChoiceScreen, type PlanChoiceSearchParams } from "./PlanChoiceScreen";
import { createStudentProfile } from "./actions";

const CLIP_SIDEWAYS_SLIDE = "overflow-x-clip";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<PlanChoiceSearchParams> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const existing = await findStudentByAccountId(session.user.id);
  if (existing) {
    const realNow = new Date();
    const standing = await planChoiceStanding(session.user.id, realNow);
    if (standing.kind !== "choose") redirect("/dashboard");
    if (standing.place !== "onboarding") redirect(PLAN_CHOICE_PATHS[standing.place]);
    return (
      <div className={CLIP_SIDEWAYS_SLIDE}>
        <PlanChoiceScreen place="onboarding" freeWeekEndsAt={standing.freeWeekEndsAt} realNow={realNow} searchParams={await searchParams} />
        <PageArrival page="Onboarding" />
      </div>
    );
  }

  const today = await studentSideToday(session.user);
  return (
    <div className={CLIP_SIDEWAYS_SLIDE}>
      <OnboardingWizard
        firstName={session.user.name?.trim().split(/\s+/)[0] || "there"}
        today={today}
        goalTestDateOptions={upcomingTestMonths(today)}
        scanningOff={(await readScanningOff(new Date())).analytics}
        admin={isAdminUser(session.user)}
        onSave={createStudentProfile}
      />
      <PageArrival page="Onboarding" />
    </div>
  );
}
