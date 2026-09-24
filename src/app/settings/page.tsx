import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import StudentIntakeForm from "@/components/StudentIntakeForm";
import type { Student } from "@/lib/types";
import { updateStudentProfile } from "../account/actions";

export default async function StudySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  await connectDB();
  const doc = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!doc) redirect("/onboarding");

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
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Study settings</h1>
        <div className="mt-8">
          <StudentIntakeForm
            mode="edit"
            initialValues={initialValues}
            submitLabel="Save changes"
            onSubmit={updateStudentProfile}
          />
        </div>
      </div>
    </div>
  );
}
