import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths, type StudentProfileInput } from "@/lib/studentProfile";
import { findStudentByAccountId } from "@/lib/studentRepository";
import StudentIntakeForm from "@/components/StudentIntakeForm";
import { updateStudentProfile } from "../account/actions";

export default async function StudySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doc = await findStudentByAccountId(session.user.id);
  if (!doc) redirect("/onboarding");

  const initialValues: StudentProfileInput = {
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
            initialValues={initialValues}
            goalTestDateOptions={upcomingTestMonths(await studentSideToday(session.user))}
            submitLabel="Save changes"
            onSubmit={updateStudentProfile}
          />
        </div>
      </div>
    </div>
  );
}
