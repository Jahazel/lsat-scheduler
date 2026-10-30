import { createHmac } from "node:crypto";

export function emailHash(email: string) {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", key).update(email).digest("hex");
}
