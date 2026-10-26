import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { readScanningOff } from "@/lib/scanSpending";
import { studentSideToday } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { initialsFor } from "@/lib/studentNav";
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

  const today = await studentSideToday(session.user);
  return (
    <OnboardingWizard
      firstName={session.user.name?.trim().split(/\s+/)[0] || "there"}
      initials={initialsFor(session.user.name, session.user.email)}
      today={today}
      goalTestDateOptions={upcomingTestMonths(today)}
      scanningOff={(await readScanningOff(new Date())).analytics}
      onSave={createStudentProfile}
    />
  );
}
