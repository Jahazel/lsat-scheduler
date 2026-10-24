import { headers } from "next/headers";

/** The only reader of the client IP address. Vercel overwrites this header, so a client cannot choose it. */
export async function clientIpAddress() {
  return (await headers()).get("x-vercel-forwarded-for") ?? "unknown";
}
