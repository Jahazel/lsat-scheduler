import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentWithOwner } from "@/lib/studentRepository";
import { adminScheduleStateMessage, loadReadOnlyCurrentWeek } from "@/lib/readOnlyCurrentWeekSchedule";
import { postgresCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { localDateInTimezone } from "@/lib/currentWeeklySchedule";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import { PageArrival } from "@/components/PagePlaceholder";
import { PlanStatusBadge } from "@/components/PlanStatusBadge";
import { loadAccountPlan } from "@/lib/billingRepository";
import { isHeldWeek } from "@/lib/planStatus";

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const record = await findStudentWithOwner(id);
  if (!record) {
    notFound();
  }

  const now = new Date();
  const plan = await loadAccountPlan(record.userId);
  const currentWeek = await loadReadOnlyCurrentWeek({
    ...postgresCurrentWeekRepositories,
    activityCheckIns: postgresActivityCheckIns,
    studentId: record.id,
    timezone: SCHEDULE_TIMEZONE,
    now: () => now,
    isHeldWeek: (weekStartDate) => isHeldWeek(plan.record, weekStartDate),
  });

  return (
    <div className="min-h-screen">
      <PageArrival page={record.email} />
      <div data-page-section className="bg-paper px-5 pt-6 md:px-18">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="text-small font-medium text-accent hover:text-ink">
            ← All students
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vellum-line px-2.5 py-1 text-caption font-medium text-smoke">
            Viewing as admin — read only
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-small text-smoke">{record.email}</p>
          <PlanStatusBadge status={plan.status} />
        </div>
      </div>
      {currentWeek.kind === "schedule" ? (
        <ScheduleCheckInView
          scheduleId={currentWeek.schedule.id}
          schedule={currentWeek.schedule.schedule}
          student={currentWeek.schedule.generationInputs.student}
          checkIns={currentWeek.checkIns}
          readOnly
          today={localDateInTimezone(now, SCHEDULE_TIMEZONE)}
        />
      ) : (
        <p data-page-section className="px-5 py-6 text-small text-smoke md:px-18">{adminScheduleStateMessage(currentWeek)}</p>
      )}
    </div>
  );
}
