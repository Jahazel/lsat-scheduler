export const ADMIN_RESTRICTED_ACTION_MESSAGE = "This action is not available for admin accounts.";

export function isAdminUser(user: { role?: string } | undefined) {
  return user?.role === "admin";
}
