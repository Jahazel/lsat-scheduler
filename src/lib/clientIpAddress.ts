import { headers } from "next/headers";
import type { SecurityLogRoute } from "./securityLog";

/** The only reader of the client IP address. Vercel overwrites this header, so a client cannot choose it. */
export function ipAddressFrom(requestHeaders: Headers) {
  return requestHeaders.get("x-vercel-forwarded-for") ?? "unknown";
}

export async function clientIpAddress() {
  return ipAddressFrom(await headers());
}

export async function passwordRequest(route: SecurityLogRoute) {
  return { route, ipAddress: await clientIpAddress(), realNow: new Date() };
}
