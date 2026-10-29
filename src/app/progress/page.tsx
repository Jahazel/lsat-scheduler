import { studentSideNow } from "@/lib/studentClock";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { listWeeklySchedulesForStudent } from "@/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { resolveProgressRoute } from "@/lib/progressHistory";
import PastWeekView from "./PastWeekView";
import ProgressOverview from "./ProgressOverview";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const { week } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  const currentWeekStartDate = currentWeekInTimezone(await studentSideNow(session.user), SCHEDULE_TIMEZONE);
  const history = await listWeeklySchedulesForStudent(student.id);
  const route = resolveProgressRoute({
    schedules: history,
    checkIns: await postgresActivityCheckIns.listForSchedules(history.map((schedule) => schedule.id)),
    currentWeekStartDate,
    requestedWeek: Array.isArray(week) ? week[0] : week,
  });

  switch (route.kind) {
    case "this_week": redirect("/dashboard");
    case "week": return (
      <div className="min-h-screen">
        <PastWeekView schedule={route.schedule} checkIns={route.checkIns} week={route.week} older={route.older} newer={route.newer} />
      </div>
    );
    case "list": return (
      <div className="min-h-screen">
        <ProgressOverview months={route.months} />
      </div>
    );
  }
}
