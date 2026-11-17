import { requireAdmin } from "./requireAdmin";
import { PageCue } from "@/components/SiteMotion";
import { PageArrival } from "@/components/PagePlaceholder";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { listStudentIdsWithApprovedAnalytics } from "@/lib/analyticsSnapshotRepository";
import { loadPlanStatuses } from "@/lib/billingRepository";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { listStateFrom, type StudentRow } from "@/lib/studentList";
import { listStudentsWithOwners } from "@/lib/studentRepository";
import { listStudentIdsWithScheduleForWeek } from "@/lib/weeklyScheduleRepository";
import { StudentsLedger } from "./StudentsLedger";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();

  const [students, withAnalytics, withThisWeek] = await Promise.all([
    listStudentsWithOwners(),
    listStudentIdsWithApprovedAnalytics(),
    listStudentIdsWithScheduleForWeek(currentWeekInTimezone(new Date(), SCHEDULE_TIMEZONE)),
  ]);
  const analytics = new Set(withAnalytics);
  const thisWeek = new Set(withThisWeek);
  const planStatuses = await loadPlanStatuses(students.map((student) => student.userId));
  const rows: StudentRow[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    plan: planStatuses.get(student.userId)?.kind ?? "no_plan",
    needsAnalytics: !analytics.has(student.id),
    hasThisWeek: thisWeek.has(student.id),
    weeklyMinutes: Object.values(student.dailyCapacityMinutes).reduce((sum, minutes) => sum + minutes, 0),
    goalTestDate: student.goalTestDate,
    joinedAt: student.joinedAt,
  }));

  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "pt-6 pb-12 md:pt-10")}>
      <PageCue page="admin" />
      <PageArrival page="Students" />
      <StudentsLedger rows={rows} initial={listStateFrom(await searchParams)} />
    </div>
  );
}
