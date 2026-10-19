import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { findStudentByAccountId } from "@/lib/studentRepository";
import OnboardingWizard from "./OnboardingWizard";
import { createStudentProfile } from "./actions";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const existing = await findStudentByAccountId(session.user.id);
  if (existing) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      goalTestDateOptions={upcomingTestMonths(await studentSideToday(session.user))}
      onSave={createStudentProfile}
    />
  );
}
