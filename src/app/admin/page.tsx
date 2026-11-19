import { requireAdmin } from "./requireAdmin";
import { PageCue } from "@/components/SiteMotion";
import { PageArrival } from "@/components/PagePlaceholder";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { listStudentIdsWithApprovedAnalytics } from "@/lib/analyticsSnapshotRepository";
import { loadAccountPlans } from "@/lib/billingRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { isHeldWeek } from "@/lib/planStatus";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import type { StudentRow } from "@/lib/studentList";
import { listStudentsWithOwners } from "@/lib/studentRepository";
import { listStudentIdsWithScheduleForWeek } from "@/lib/weeklyScheduleRepository";
import { StudentsLedger } from "./StudentsLedger";

export default async function AdminPage() {
  await requireAdmin();

  const week = currentWeekInTimezone(new Date(), SCHEDULE_TIMEZONE);
  const [students, withAnalytics, withThisWeek] = await Promise.all([
    listStudentsWithOwners(),
    listStudentIdsWithApprovedAnalytics(),
    listStudentIdsWithScheduleForWeek(week),
  ]);
  const analytics = new Set(withAnalytics);
  const thisWeek = new Set(withThisWeek);
  const plans = await loadAccountPlans(students.map((student) => student.userId));
  const rows: StudentRow[] = students.map((student) => {
    const plan = plans.get(student.userId);
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      plan: plan?.status.kind ?? "no_plan",
      needsAnalytics: !analytics.has(student.id),
      thisWeek: !thisWeek.has(student.id) ? "none" : isHeldWeek(plan?.record ?? null, week) ? "held" : "ready",
      weeklyMinutes: Object.values(student.dailyCapacityMinutes).reduce((sum, minutes) => sum + minutes, 0),
      goalTestDate: student.goalTestDate,
      joinedAt: student.joinedAt,
    };
  });

  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page="Students" />
      <StudentsLedger rows={rows} />
    </div>
  );
}
