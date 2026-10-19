import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { studentSideNow } from "@/lib/studentClock";
import { upcomingTestMonths } from "@/lib/studentProfile";
import { findStudentByAccountId } from "@/lib/studentRepository";
import StudentIntakeForm from "@/components/StudentIntakeForm";
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
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Tell us about your prep</h1>
        <p className="mt-1 text-sm text-ink-500">
          This builds your first week — you can update it any time from Account.
        </p>
        <div className="mt-8">
          <StudentIntakeForm
            mode="create"
            goalTestDateOptions={upcomingTestMonths(dateInScheduleTimezone(await studentSideNow(session.user)))}
            submitLabel="Generate my schedule"
            onSubmit={createStudentProfile}
          />
        </div>
      </div>
    </div>
  );
}
