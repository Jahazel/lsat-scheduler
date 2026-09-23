import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { formatDuration } from "@/lib/formatDuration";
import { listStudentsWithOwners } from "@/lib/students";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  await connectDB();
  const [students, snapshots] = await Promise.all([
    listStudentsWithOwners(),
    AnalyticsSnapshotModel.find({ status: "approved" }, { studentId: 1 }).lean(),
  ]);
  const studentIdsWithAnalytics = new Set(snapshots.map((s) => String(s.studentId)));

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">All students</h1>

        {students.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border-y border-ink-100 px-6 py-16 text-center">
            <p className="text-sm text-ink-500">No students have completed onboarding yet.</p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-ink-100 border-y border-ink-100">
            {students.map((student) => {
              const needsAnalytics = student.platform === "7Sage" && !studentIdsWithAnalytics.has(student.id);
              return (
                <li key={student.id}>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="group flex items-center gap-4 px-1 py-4 transition-colors duration-150 ease-out hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-25"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink-900">{student.name}</span>
                        {needsAnalytics && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            Needs analytics
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-ink-500">
                        {student.email} · {student.platform} ·{" "}
                        {formatDuration(
                          Object.values(student.dailyCapacityMinutes).reduce((sum, minutes) => sum + minutes, 0)
                        )}{" "}
                        per week
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
