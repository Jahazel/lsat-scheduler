import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/accessControl";

/** Sends anyone who is not an admin to their own This week. */
export async function requireAdmin() {
  const session = await auth();
  if (!isAdminUser(session?.user)) redirect("/dashboard");
}
