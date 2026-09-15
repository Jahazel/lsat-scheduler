export const ADMIN_READ_ONLY_MESSAGE = "Admins have read-only access";

export function isAdminUser(user: { role?: string } | undefined) {
  return user?.role === "admin";
}
