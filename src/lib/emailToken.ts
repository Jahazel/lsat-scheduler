import { createHash, randomBytes } from "node:crypto";

export function newEmailToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailToken(token) };
}

export function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
