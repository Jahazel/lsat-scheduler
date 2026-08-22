import Link from "next/link";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 15V4M12 4L8 8M12 4l4 4M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RosterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 20a5.5 5.5 0 0111 0M16 8.5a2.5 2.5 0 100-5M20.5 20a4.5 4.5 0 00-5.6-4.36"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function Home() {
  await connectDB();
  const [students, snapshots] = await Promise.all([
    StudentModel.find().sort({ name: 1 }).lean(),
    AnalyticsSnapshotModel.find({}, { studentId: 1 }).lean(),
  ]);
  const studentIdsWithAnalytics = new Set(snapshots.map((s) => String(s.studentId)));

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Students</h1>
          <Link
            href="/students/new"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-accent-600 transition-colors duration-150 ease-out hover:bg-accent-100 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-25"
          >
            <PlusIcon className="size-4" />
            Add student
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 border-y border-ink-100 px-6 py-16 text-center">
            <RosterIcon className="size-6 text-ink-400" />
            <p className="text-sm text-ink-500">
              No students yet. Add one to generate their first schedule.
            </p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-ink-100 border-y border-ink-100">
            {students.map((student) => {
              const needsAnalytics = !studentIdsWithAnalytics.has(String(student._id));
              return (
                <li key={String(student._id)}>
                  <Link
                    href={`/students/${student._id}`}
                    className="group flex items-center gap-4 px-1 py-4 transition-colors duration-150 ease-out hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-25"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink-900">{student.name}</span>
                        {needsAnalytics && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                            <UploadIcon className="size-3" />
                            Needs analytics
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-ink-500">
                        {student.platform} · {student.weekdayHours}h weekday /{" "}
                        {student.weekendHours}h weekend
                      </p>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-ink-400 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
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
