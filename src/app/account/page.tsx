import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import StudentIntakeForm from "@/components/StudentIntakeForm";
import type { Student } from "@/lib/types";
import { deleteAccount, updateStudentProfile } from "./actions";

export default async function AccountPage() {
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

  const initialValues: Student = {
    platform: doc.platform,
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Account</h1>
        <p className="mt-1 text-sm text-ink-500">{session.user.email}</p>
        <div className="mt-8">
          <StudentIntakeForm
            mode="edit"
            initialValues={initialValues}
            submitLabel="Save changes"
            onSubmit={updateStudentProfile}
          />
        </div>
        <form action={deleteAccount} className="mt-10 border-t border-red-100 pt-6">
          <h2 className="font-semibold text-red-700">Delete account</h2>
          <p className="mt-1 text-sm text-ink-500">
            This permanently removes your profile, approved and legacy analytics snapshots, weekly schedules, and
            activity check-ins from active storage.
          </p>
          <label className="mt-4 block text-sm font-medium text-ink-700">
            Type DELETE to confirm
            <input
              name="confirmation"
              required
              className="mt-1 block w-full rounded-md border border-ink-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="mt-3 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete account
          </button>
        </form>
      </div>
    </div>
  );
}
