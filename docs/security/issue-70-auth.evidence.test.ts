import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";

const mocks = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  findAccount: vi.fn(),
  findAccountById: vi.fn(),
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
  findAccountByEmail: mocks.findAccount, findAccountById: mocks.findAccountById,
  findAccountByGoogleId: mocks.findGoogleAccount, createAccount: mocks.createAccount,
}));
import "@/auth";

function config() {
  if (!mocks.config) throw new Error("Auth configuration was not captured");
  return mocks.config;
}

describe("issue 70 authentication evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fixed in issue 226: offers Google as the only sign-in provider, so no password can sign in", () => {
    expect(config().providers.map((provider) => typeof provider === "function" ? provider().id : provider.id)).toEqual(["google"]);
  });

  it("fixed in issue 140: refuses an unverified Google email and never looks an Account up by email", async () => {
    mocks.findGoogleAccount.mockResolvedValue(null);
    const account = { provider: "google", providerAccountId: "synthetic-google-sub", type: "oidc" as const };
    const user = { id: "synthetic-google-sub", email: "ADMIN@example.invalid" };
    const signIn = config().callbacks!.signIn!;
    expect(await signIn({ user, account, profile: { sub: user.id, email_verified: false } })).toBe(false);
    expect(mocks.createAccount).not.toHaveBeenCalled();
    mocks.findGoogleAccount.mockResolvedValue({ id: "synthetic-admin", role: "admin", disabledAt: null, sessionVersion: 0 });
    const token = await config().callbacks!.jwt!({
      token: {}, user, account, trigger: "signIn", profile: { email_verified: true },
    });
    expect(token).toMatchObject({ id: "synthetic-admin", role: "admin" });
    expect(mocks.findGoogleAccount).toHaveBeenCalledWith("synthetic-google-sub");
    expect(mocks.findAccount).not.toHaveBeenCalled();
  });

  it("fixed in issue 225: ends a deleted or demoted user's session on the next session access", async () => {
    const token = { id: "synthetic-admin", role: "admin" as const, sessionVersion: 0, signedInAt: Math.floor(Date.now() / 1000) };
    // Auth.js omits user on session refresh, despite declaring it required.
    const refresh = () => config().callbacks!.jwt!({ token } as unknown as Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0]);
    mocks.findAccountById.mockResolvedValue(null);
    expect(await refresh()).toBeNull();
    mocks.findAccountById.mockResolvedValue({ id: token.id, role: "student", disabledAt: null, sessionVersion: 1 });
    expect(await refresh()).toBeNull();
    expect(mocks.findAccountById).toHaveBeenCalledWith("synthetic-admin");
  });
});
