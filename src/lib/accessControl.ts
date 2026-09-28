export const ADMIN_RESTRICTED_ACTION_MESSAGE = "This action is not available for admin accounts.";

export function isAdminUser<T extends { role?: string }>(user: T | null | undefined): user is T & { role: "admin" } {
  return user?.role === "admin";
}
