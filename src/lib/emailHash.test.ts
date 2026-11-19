import { afterEach, expect, it, vi } from "vitest";
import { emailHash } from "./emailHash";

afterEach(() => {
  vi.unstubAllEnvs();
});

it("keeps the same hash for an email when AUTH_SECRET changes", () => {
  vi.stubEnv("EMAIL_HASH_SECRET", "email-hash-test-secret-0123456789");
  vi.stubEnv("AUTH_SECRET", "first-auth-secret-0123456789");
  const before = emailHash("maya@example.test");
  vi.stubEnv("AUTH_SECRET", "second-auth-secret-0123456789");
  expect(emailHash("maya@example.test")).toBe(before);
});

it.each([["unset", undefined], ["empty", ""], ["blank", "   "]])("refuses to hash when EMAIL_HASH_SECRET is %s", (_, value) => {
  vi.stubEnv("AUTH_SECRET", "auth-secret-0123456789");
  vi.stubEnv("EMAIL_HASH_SECRET", value);
  expect(() => emailHash("maya@example.test")).toThrow("EMAIL_HASH_SECRET is not set");
});
