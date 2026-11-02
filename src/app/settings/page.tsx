import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { saveStudySettings } from "./actions";
import { StudySettingsForm } from "./StudySettingsForm";

export default async function StudySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-vellum">
      <header className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-8 md:pt-10 md:pb-8 lg:px-18 lg:pt-12 lg:pb-10">
        <div className="mx-auto flex max-w-content flex-col gap-3">
          <h1 className="text-h3 font-semibold text-ink md:text-h2">Study settings</h1>
          <p className="text-body text-smoke md:text-lead">Your goal and your week. Changes apply to your next weekly schedule.</p>
        </div>
      </header>
      <StudySettingsForm
        currentScore={student.currentScore}
        saved={{
          goalScore: student.goalScore,
          goalTestDate: student.goalTestDate,
          accommodationMultiplier: student.accommodationMultiplier,
          dailyCapacityMinutes: student.dailyCapacityMinutes,
          preferredPracticeTestDay: student.preferredPracticeTestDay,
        }}
        goalTestDateOptions={upcomingTestMonths(await studentSideToday(session.user))}
        onSave={saveStudySettings}
      />
    </div>
  );
}
