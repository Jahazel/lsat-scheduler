import { isAdminUser } from "@/lib/accessControl";
import { NOBODY, recordSecurityEvent, type SecurityLogRoute } from "@/lib/securityLog";
import { auth } from "@/auth";

export class AdminAccessRequired extends Error {
  name = "AdminAccessRequired";
}

export async function requireCurrentAdmin(route: SecurityLogRoute) {
  const session = await auth();
  if (!session?.user?.id || !isAdminUser(session.user)) {
    await recordSecurityEvent({
      event: "admin_action_refused", result: "refused", route,
      who: session?.user?.id ? { account: session.user.id } : NOBODY,
    });
    throw new AdminAccessRequired("Admin access required.");
  }
  return session.user.id;
}
