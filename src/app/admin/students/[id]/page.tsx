import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { listApprovedAnalyticsSnapshots } from "@/lib/analyticsSnapshotRepository";
import { getStudentWithOwner } from "@/lib/students";
import { generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import type { AnalyticsSnapshot, Student } from "@/lib/types";
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

  const student: Student = {
    platform: record.platform,
    currentScore: record.currentScore,
    goalScore: record.goalScore,
    weekdayHours: record.weekdayHours,
    weekendHours: record.weekendHours,
    accommodationMultiplier: record.accommodationMultiplier,
    goalTestDate: record.goalTestDate,
  };

  const [snapshotDoc] = await listApprovedAnalyticsSnapshots(record.id);
  const analytics: AnalyticsSnapshot = snapshotDoc
    ? {
        weekOf: snapshotDoc.weekOf,
        lrAccuracyByType: snapshotDoc.lrAccuracyByType,
        lrTopPriorityLogicTypes: snapshotDoc.lrTopPriorityLogicTypes,
      }
    : mockAnalytics;
  const isRealAnalytics = Boolean(snapshotDoc);

  const schedule = generateWeek(student, analytics, mockRules, record.name);

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
          <WeeklyScheduleView schedule={schedule} student={student} isRealAnalytics={isRealAnalytics} />
        </div>
      </div>
    </div>
  );
}
