import { isAdminUser } from "@/lib/accessControl";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { signedInRecently } from "@/lib/accountSession";
import { DeletionCard } from "./DeletionCard";
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
        <DeletionCard admin={isAdminUser(session.user)} signedInRecently={signedInRecently(session.signedInAt)} />
      </div>
    </div>
  );
}
