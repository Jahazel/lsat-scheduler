import { isAdminUser } from "@/lib/accessControl";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { signedInRecently } from "@/lib/accountSession";
import { findPasswordAccountById, isAccountId } from "@/lib/accountRepository";
import { ChangePasswordCard } from "./ChangePasswordCard";
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
  const isPasswordAccount = isAccountId(session.user.id) && !!(await findPasswordAccountById(session.user.id));

  return (
    <div className="min-h-screen bg-vellum">
      <header className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10">
        <div className="mx-auto flex max-w-content flex-col gap-3">
          <h1 className="text-h3 font-semibold text-ink md:text-h2">Account</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body text-ink md:text-lead">{session.user.email}</p>
            <span className="flex h-7 items-center rounded-pill border border-vellum-line px-3 text-small text-smoke">
              {isPasswordAccount ? "Password sign-in" : "Google sign-in"}
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto box-content flex max-w-content flex-col gap-6 px-5 py-10 md:px-18 md:pt-16 md:pb-24">
        <SessionsCard />
        {isPasswordAccount && <ChangePasswordCard />}
        <DeletionCard
          mode={isAdminUser(session.user) ? { kind: "admin" }
            : isPasswordAccount ? { kind: "password" }
            : { kind: "google", signedInRecently: signedInRecently(session.signedInAt, new Date()) }}
        />
      </div>
    </div>
  );
}
