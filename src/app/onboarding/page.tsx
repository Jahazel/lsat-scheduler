import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import StudentIntakeForm from "@/components/StudentIntakeForm";
import { createStudentProfile } from "./actions";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "admin") {
    redirect("/admin");
  }

  await connectDB();
  const existing = await StudentModel.findOne({ userId: session.user.id }).lean();
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
            submitLabel="Generate my schedule"
            onSubmit={createStudentProfile}
          />
        </div>
      </div>
    </div>
  );
}
