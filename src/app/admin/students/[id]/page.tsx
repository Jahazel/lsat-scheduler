import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { getStudentWithOwner } from "@/lib/students";
import { adminScheduleStateMessage, loadReadOnlyCurrentWeek } from "@/lib/readOnlyCurrentWeekSchedule";
import { mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;

  await connectDB();
  const record = await getStudentWithOwner(id);
  if (!record) {
    notFound();
  }

  const currentWeek = await loadReadOnlyCurrentWeek({
    ...mongooseCurrentWeekRepositories,
    activityCheckIns: mongooseActivityCheckIns,
    studentId: record.id,
    timezone: SCHEDULE_TIMEZONE,
    now: () => new Date(),
  });

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="text-sm font-medium text-accent-600 hover:text-accent-700">
            ← All students
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
            Viewing as admin — read only
          </span>
        </div>
        <p className="mt-4 text-sm text-ink-500">{record.email}</p>
        <div className="mt-2">
          {currentWeek.kind === "schedule" ? (
            <ScheduleCheckInView
              scheduleId={currentWeek.schedule.id}
              schedule={currentWeek.schedule.schedule}
              student={currentWeek.schedule.generationInputs.student}
              checkIns={currentWeek.checkIns}
              readOnly
            />
          ) : (
            <p className="text-sm text-ink-500">{adminScheduleStateMessage(currentWeek)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
