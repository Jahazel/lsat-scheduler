import { isAdminUser } from "@/lib/accessControl";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { deleteAccount } from "./actions";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const doc = await findStudentByAccountId(session.user.id);
  if (!doc) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Account</h1>
        <p className="mt-1 text-sm text-smoke">{session.user.email}</p>
        {!isAdminUser(session.user) && (
          <form action={deleteAccount} className="mt-10 border-t border-danger pt-6">
            <h2 className="font-semibold text-danger-ink">Delete account</h2>
            <p className="mt-1 text-sm text-smoke">
              This permanently removes your profile, approved and legacy analytics snapshots, weekly schedules, and
              activity check-ins from active storage.
            </p>
            <label className="mt-4 block text-sm font-medium text-smoke">
              Type DELETE to confirm
              <input
                name="confirmation"
                required
                className="mt-1 block w-full rounded-sm border border-vellum-line px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="mt-3 rounded-sm border border-danger px-4 py-2 text-sm font-medium text-danger-ink hover:bg-danger/faint"
            >
              Delete account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
