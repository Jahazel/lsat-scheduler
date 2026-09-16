import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { loadOrGenerateCurrentWeek } from "@/lib/currentWeeklySchedule";
import { mockRules } from "@/lib/mockData";
import { listWeeklySchedulesForStudent, mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import { simulatedScheduleNow } from "@/lib/scheduleTestDate";
import type { Student } from "@/lib/types";
import ScheduleCheckInView from "@/components/ScheduleCheckInView";
import AnalyticsUploader from "./AnalyticsUploader";

type DashboardSearchParams = { scheduleTestDate?: string | string[]; historyWeek?: string | string[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { scheduleTestDate, historyWeek } = await searchParams;
  const testNow = simulatedScheduleNow(scheduleTestDate);
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "admin") {
    redirect("/admin");
  }

  await connectDB();
  const doc = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!doc) {
    redirect("/onboarding");
  }

  const student: Student = {
    platform: doc.platform,
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    weekdayHours: doc.weekdayHours,
    weekendHours: doc.weekendHours,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  const currentWeek = await loadOrGenerateCurrentWeek({
    ...mongooseCurrentWeekRepositories,
    studentId: String(doc._id),
    student,
    studentName: session.user.name ?? "Your",
    rules: mockRules,
    policyVersion: "adaptive-weekly-schedule-v1",
    timezone: "America/Chicago",
    now: () => testNow ?? new Date(),
  });
  const checkIns = currentWeek.kind === "schedule"
    ? await mongooseActivityCheckIns.listForSchedule(currentWeek.schedule.id)
    : [];
  const scheduleHistory = await listWeeklySchedulesForStudent(String(doc._id));
  const selectedHistoryWeek = typeof historyWeek === "string" ? historyWeek : undefined;
  const selectedHistory = selectedHistoryWeek
    ? scheduleHistory.find((schedule) => schedule.weekStartDate === selectedHistoryWeek) ?? null
    : null;
  const selectedHistoryCheckIns = selectedHistory
    ? await mongooseActivityCheckIns.listForSchedule(selectedHistory.id)
    : [];

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {process.env.NODE_ENV === "development" && (
          <form className="mb-8 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4" method="get">
            <h2 className="font-semibold text-ink-900">Schedule test date</h2>
            <p className="mt-1 text-sm text-ink-700">Choose a date to create or view that week&apos;s schedule. This control appears only while running <code>npm run dev</code>.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium text-ink-700">
                Simulated date
                <input className="ml-2 rounded-md border border-ink-200 bg-white px-2 py-1" defaultValue={typeof scheduleTestDate === "string" ? scheduleTestDate : ""} name="scheduleTestDate" type="date" />
              </label>
              <button className="rounded-md bg-ink-900 px-3 py-1.5 text-sm font-medium text-white" type="submit">Load week</button>
              {testNow && <a className="text-sm font-medium text-ink-700 underline" href="/dashboard">Use today</a>}
            </div>
          </form>
        )}
        {currentWeek.kind === "schedule" ? (() => {
          const schedule = currentWeek.schedule;
          return <ScheduleCheckInView
            scheduleId={schedule.id}
            schedule={schedule.schedule}
            student={schedule.generationInputs.student}
            checkIns={checkIns}
            statusFirst
          />;
        })() : (
          <div className="rounded-lg border border-ink-100 bg-white p-6">
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">Upload approved analytics to begin</h1>
            <p className="mt-2 text-sm text-ink-500">
              Confirm a fresh 7Sage analytics extraction to create this week&apos;s schedule.
            </p>
            {student.platform === "7Sage" && <AnalyticsUploader scheduleTestDate={typeof scheduleTestDate === "string" ? scheduleTestDate : undefined} />}
          </div>
        )}
        {selectedHistory && (
          <section className="mt-10 border-t border-ink-200 pt-8">
            <p className="text-sm font-medium text-ink-700">Saved schedule</p>
            <ScheduleCheckInView
              scheduleId={selectedHistory.id}
              schedule={selectedHistory.schedule}
              student={selectedHistory.generationInputs.student}
              checkIns={selectedHistoryCheckIns}
              statusFirst
            />
          </section>
        )}
        {scheduleHistory.length > 0 && (
          <section className="mt-10 border-t border-ink-200 pt-6">
            <h2 className="font-semibold text-ink-900">Schedule history</h2>
            <p className="mt-1 text-sm text-ink-500">Open a saved week to review its plan and check-ins.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {scheduleHistory.map((schedule) => (
                <li key={schedule.id}>
                  <a className="text-sm font-medium text-accent-700 underline" href={`/dashboard?historyWeek=${schedule.weekStartDate}`}>
                    Week of {schedule.weekStartDate}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
