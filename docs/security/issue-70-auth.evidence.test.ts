import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  findAccount: vi.fn(),
  findGoogleAccount: vi.fn(),
  createAccount: vi.fn(),
}));
vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    mocks.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("@/lib/accountRepository", () => ({
  findAccountByEmail: mocks.findAccount, findAccountByGoogleId: mocks.findGoogleAccount, createAccount: mocks.createAccount,
}));
import "@/auth";

function config() {
  if (!mocks.config) throw new Error("Auth configuration was not captured");
  return mocks.config;
}

describe("issue 70 authentication evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an operator object in credentials before querying Postgres", async () => {
    const provider = config().providers[1] as unknown as {
      options: { authorize: (credentials: Record<string, unknown>) => Promise<unknown> };
    };
    expect(await provider.options.authorize({ email: { $ne: null }, password: "synthetic123" })).toBeNull();
    expect(mocks.findAccount).not.toHaveBeenCalled();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("fixed in issue 140: refuses an unverified Google email and never looks an Account up by email", async () => {
    mocks.findGoogleAccount.mockResolvedValue(null);
    const account = { provider: "google", providerAccountId: "synthetic-google-sub", type: "oidc" as const };
    const user = { id: "synthetic-google-sub", email: "ADMIN@example.invalid" };
    const signIn = config().callbacks!.signIn!;
    expect(await signIn({ user, account, profile: { sub: user.id, email_verified: false } })).toBe(false);
    expect(mocks.createAccount).not.toHaveBeenCalled();
    mocks.findGoogleAccount.mockResolvedValue({ id: "synthetic-admin", role: "admin" });
    const token = await config().callbacks!.jwt!({
      token: {}, user, account, trigger: "signIn", profile: { email_verified: true },
    });
    expect(token).toMatchObject({ id: "synthetic-admin", role: "admin" });
    expect(mocks.findGoogleAccount).toHaveBeenCalledWith("synthetic-google-sub");
    expect(mocks.findAccount).not.toHaveBeenCalled();
  });

  it("retains a deleted or demoted user's token claims on subsequent session access", async () => {
    const token = { id: "synthetic-deleted-admin", role: "admin" };
    // Auth.js omits user on session refresh, despite declaring it required.
    const result = await config().callbacks!.jwt!({ token } as unknown as Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0]);
    expect(result).toEqual(token);
    expect(mocks.findAccount).not.toHaveBeenCalled();
  });

  it("bcrypt ignores differences after the first 72 bytes of an accepted long password", async () => {
    const prefix = "a1".repeat(36);
    const hash = await bcrypt.hash(`${prefix}first-suffix`, 10);
    expect(await bcrypt.compare(`${prefix}different-suffix`, hash)).toBe(true);
  });
});
