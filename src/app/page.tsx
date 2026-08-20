import Link from "next/link";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";

export default async function Home() {
  await connectDB();
  const students = await StudentModel.find().sort({ name: 1 }).lean();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Students</h1>
          <Link
            href="/students/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Add student
          </Link>
        </div>

        {students.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
            No students yet. Add one to generate their first schedule.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {students.map((student) => (
              <li key={String(student._id)}>
                <Link
                  href={`/students/${student._id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <span className="font-medium text-black dark:text-zinc-50">{student.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {student.platform} · {student.weekdayHours}h weekday / {student.weekendHours}h
                    weekend
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
