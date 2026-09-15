import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { getStudentWithOwner } from "@/lib/students";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { persistedWeeklySchedule } from "@/lib/weeklyScheduleRepository";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import WeeklyScheduleView from "@/components/WeeklyScheduleView";

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

  const weekStartDate = currentWeekInTimezone(new Date(), "America/Chicago");
  const savedSchedule = await WeeklyScheduleModel.findOne({ studentId: record.id, weekStartDate }).lean();
  const currentWeek = savedSchedule ? persistedWeeklySchedule(savedSchedule) : null;

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
          {currentWeek ? (
            <WeeklyScheduleView
              schedule={currentWeek.schedule}
              student={currentWeek.generationInputs.student}
              isRealAnalytics
            />
          ) : (
            <p className="text-sm text-ink-500">No saved schedule exists for the current week.</p>
          )}
        </div>
      </div>
    </div>
  );
}
