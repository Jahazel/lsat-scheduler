import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadChosenPlan } from "@/lib/billingRepository";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { planChoicePlace } from "@/lib/planStatus";
import { readScanningOff } from "@/lib/scanSpending";
import { studentSideClock } from "@/lib/studentClock";
import { findStudentByAccountId } from "@/lib/studentRepository";
import type { Student } from "@/lib/types";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { openWeeklyUpload } from "@/lib/weeklyUpload";
import { PageCue } from "@/components/SiteMotion";
import { PageArrival } from "@/components/PagePlaceholder";
import { PlanChoiceScreen, type PlanChoiceSearchParams } from "@/app/onboarding/PlanChoiceScreen";
import { confirmWeeklyUpload } from "./actions";
import WeeklyUploadFlow from "./WeeklyUploadFlow";

export default async function WeeklyUploadPage({ searchParams }: { searchParams: Promise<PlanChoiceSearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doc = await findStudentByAccountId(session.user.id);
  if (!doc) redirect("/onboarding");
  const { status } = await loadChosenPlan(session.user.id);
  if (planChoicePlace(status) === "weekly_upload") {
    return (
      <div data-page-fade>
        <PageCue page="this-week" />
        <PageArrival page="Weekly upload" look="fade" />
        <PlanChoiceScreen place="weekly_upload" freeWeekEndsAt={null} realNow={new Date()} searchParams={await searchParams} />
      </div>
    );
  }

  const student: Student = {
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };
  const [clock, schedules, snapshots] = await Promise.all([
    studentSideClock(session.user),
    listWeeklySchedulesForStudent(doc.id),
    listApprovedAnalyticsSnapshots(doc.id),
  ]);
  const basis = openWeeklyUpload({ clock, student, schedules, snapshots });
  if (!basis) redirect("/dashboard");

  return (
    <div data-page-fade>
      <PageCue page="this-week" />
      <PageArrival page="Weekly upload" look="fade" />
      <WeeklyUploadFlow basis={basis} initialScore={doc.currentScore} scanningOff={await readScanningOff(clock.real)} confirm={confirmWeeklyUpload} />
    </div>
  );
}
