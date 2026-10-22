import { isAdminUser } from "@/lib/accessControl";
import { auth } from "@/auth";

export async function requireCurrentAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdminUser(session.user))
    throw new Error("Admin access required.");
  return session.user.id;
}
