import type { Metadata } from "next";
import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = { referrer: "no-referrer" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  return <VerifyEmail token={typeof token === "string" ? token : ""} />;
}
