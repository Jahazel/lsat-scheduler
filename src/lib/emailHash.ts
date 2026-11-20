import { createHmac } from "node:crypto";

export function emailHash(email: string) {
  const key = process.env.EMAIL_HASH_SECRET;
  if (!key?.trim()) throw new Error("EMAIL_HASH_SECRET is not set");
  return createHmac("sha256", key).update(email).digest("hex");
}
