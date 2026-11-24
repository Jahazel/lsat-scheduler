import { studentSideNow } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { loadPastWeeks } from "@/lib/studentView";
import { resolveProgressRoute } from "@/lib/progressHistory";
import PastWeekView from "./PastWeekView";
import { ProgressScreen } from "./ProgressMotion";
import ProgressOverview from "./ProgressOverview";
import { loadChosenPlan } from "@/lib/billingRepository";
import { planProblemNote } from "@/lib/planNotes";
import { PlanNotice } from "@/components/PlanNotes";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const requestedWeek = Array.isArray(week) ? week[0] : week;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const currentWeekStartDate = currentWeekInTimezone(await studentSideNow(session.user), SCHEDULE_TIMEZONE);
  const { status } = await loadChosenPlan(session.user.id);
  const route = resolveProgressRoute({
    ...await loadPastWeeks(student.id, currentWeekStartDate),
    currentWeekStartDate,
    requestedWeek,
  });

  const lapsedNote = status.kind === "lapsed" && planProblemNote(status);

  switch (route.kind) {
    case "this_week": redirect("/dashboard");
    case "week": return (
      <ProgressScreen week={route.week.weekStartDate} requested={requestedWeek}>
        <PastWeekView schedule={route.schedule} checkIns={route.checkIns} week={route.week} older={route.older} newer={route.newer} />
      </ProgressScreen>
    );
    case "list": return (
      <ProgressScreen requested={requestedWeek}>
        <ProgressOverview months={route.months} notice={lapsedNote && <PlanNotice note={lapsedNote} />} />
      </ProgressScreen>
    );
  }
}
