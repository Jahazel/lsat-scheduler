import type { Metadata } from "next";
import { hashEmailToken } from "@/lib/emailToken";
import { findResetLinkEmail } from "@/lib/passwordResetRepository";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const linkWorks = typeof token === "string" && !!token && !!(await findResetLinkEmail(hashEmailToken(token), new Date()));
  return <ResetPassword token={linkWorks ? token : null} />;
}
