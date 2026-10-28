import type { Metadata } from "next";
import { resetLinkWorks } from "@/lib/passwordAccount";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const linkWorks = typeof token === "string" && !!token && (await resetLinkWorks(token, new Date()));
  return <ResetPassword token={linkWorks ? token : null} />;
}
