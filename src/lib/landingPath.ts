export function landingPathForRole(role: string | undefined): "/admin" | "/dashboard" {
  return role === "admin" ? "/admin" : "/dashboard";
}
