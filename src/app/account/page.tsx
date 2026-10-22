import { isAdminUser } from "@/lib/accessControl";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { deleteAccount } from "./actions";
import { SessionsCard } from "./SessionsCard";

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
    <div className="min-h-screen bg-vellum">
      <header className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10">
        <div className="mx-auto flex max-w-content flex-col gap-3">
          <h1 className="text-h3 font-semibold text-ink md:text-h2">Account</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body text-ink md:text-lead">{session.user.email}</p>
            <span className="flex h-7 items-center rounded-pill border border-vellum-line px-3 text-small text-smoke">
              Google sign-in
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto box-content flex max-w-content flex-col gap-6 px-5 py-10 md:px-18 md:pt-16 md:pb-24">
        <SessionsCard />
        {!isAdminUser(session.user) && (
          <form action={deleteAccount} className="rounded-md border border-vellum-line bg-paper p-5 md:p-8">
            <h2 className="font-semibold text-danger-ink">Delete account</h2>
            <p className="mt-1 text-small text-smoke">
              This permanently removes your profile, approved and legacy analytics snapshots, weekly schedules, and
              activity check-ins from active storage.
            </p>
            <label className="mt-4 block text-small font-medium text-smoke">
              Type DELETE to confirm
              <input
                name="confirmation"
                required
                className="mt-1 block w-full rounded-sm border border-vellum-line bg-paper px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="mt-3 rounded-sm border border-danger bg-paper px-4 py-2 text-small font-medium text-danger-ink hover:bg-danger/faint"
            >
              Delete account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
