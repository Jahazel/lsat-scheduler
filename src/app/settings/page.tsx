import { redirect } from "next/navigation";
import { PageArrival } from "@/components/PagePlaceholder";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { findOfficialAttempts, findStudentByAccountId } from "@/lib/studentRepository";
import { saveStudySettings } from "./actions";
import { StudySettingsForm } from "./StudySettingsForm";

export default async function StudySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) redirect("/onboarding");
  const today = await studentSideToday(session.user);

  return (
    <div className="min-h-screen bg-vellum">
      <PageArrival page="Study settings" />
      <StudySettingsForm
        currentScore={student.currentScore}
        saved={{
          goalScore: student.goalScore,
          goalTestDate: student.goalTestDate,
          accommodationMultiplier: student.accommodationMultiplier,
          dailyCapacityMinutes: student.dailyCapacityMinutes,
          preferredPracticeTestDay: student.preferredPracticeTestDay,
          officialAttempts: await findOfficialAttempts(session.user.id),
        }}
        today={today}
        goalTestDateOptions={upcomingTestMonths(today)}
        onSave={saveStudySettings}
      />
    </div>
  );
}
