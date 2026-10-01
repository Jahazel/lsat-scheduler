import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";

// Capture application callbacks. This does not simulate Google's token verifier.
const mocks = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  connectDB: vi.fn(),
  findUser: vi.fn(),
  createUser: vi.fn(),
}));
vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    mocks.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/User", () => ({
  UserModel: { findOne: mocks.findUser, create: mocks.createUser },
}));
import "@/auth";

function config() {
  if (!mocks.config) throw new Error("Auth configuration was not captured");
  return mocks.config;
}

describe("issue 70 authentication evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an operator object in credentials before querying MongoDB", async () => {
    const provider = config().providers[1] as unknown as {
      options: { authorize: (credentials: Record<string, unknown>) => Promise<unknown> };
    };
    expect(await provider.options.authorize({ email: { $ne: null }, password: "synthetic123" })).toBeNull();
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.connectDB).not.toHaveBeenCalled();
  });

  it("links a Google identity to an existing admin by email without checking email_verified", async () => {
    mocks.findUser.mockResolvedValue({ _id: "synthetic-admin", role: "admin" });
    const account = { provider: "google", providerAccountId: "synthetic-google-sub", type: "oidc" as const };
    const user = { id: "synthetic-google-sub", email: "ADMIN@example.invalid" };
    const signIn = config().callbacks!.signIn!;
    expect(await signIn({ user, account, profile: { sub: user.id, email_verified: false } })).toBe(true);
    const token = await config().callbacks!.jwt!({
      token: {}, user, account, trigger: "signIn", profile: { email_verified: false },
    });
    expect(token).toMatchObject({ id: "synthetic-admin", role: "admin" });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.findUser).toHaveBeenCalledWith({ email: "admin@example.invalid" });
  });

  it("retains a deleted or demoted user's token claims on subsequent session access", async () => {
    const token = { id: "synthetic-deleted-admin", role: "admin" };
    // Auth.js omits user on session refresh, despite declaring it required.
    const result = await config().callbacks!.jwt!({ token } as unknown as Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0]);
    expect(result).toEqual(token);
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it("bcrypt ignores differences after the first 72 bytes of an accepted long password", async () => {
    const prefix = "a1".repeat(36);
    const hash = await bcrypt.hash(`${prefix}first-suffix`, 10);
    expect(await bcrypt.compare(`${prefix}different-suffix`, hash)).toBe(true);
  });
});
