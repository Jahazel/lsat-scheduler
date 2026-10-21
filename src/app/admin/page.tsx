import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listStudentIdsWithApprovedAnalytics } from "@/lib/analyticsSnapshotRepository";
import { formatDuration } from "@/lib/formatDuration";
import { listStudentsWithOwners } from "@/lib/studentRepository";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const [students, snapshots] = await Promise.all([
    listStudentsWithOwners(),
    listStudentIdsWithApprovedAnalytics(),
  ]);
  const studentIdsWithAnalytics = new Set(snapshots);

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">All students</h1>

        {students.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border-y border-vellum-line px-6 py-16 text-center">
            <p className="text-sm text-smoke">No students have completed onboarding yet.</p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-vellum-line border-y border-vellum-line">
            {students.map((student) => {
              const needsAnalytics = !studentIdsWithAnalytics.has(student.id);
              return (
                <li key={student.id}>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="group flex items-center gap-4 px-1 py-4 transition-colors duration-150 ease-out hover:bg-vellum-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-vellum"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{student.name}</span>
                        {needsAnalytics && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/tint px-2 py-0.5 text-xs font-medium text-accent">
                            Needs analytics
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-smoke">
                        {student.email} ·{" "}
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
