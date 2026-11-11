import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  openCustomerPortalSession: vi.fn<(accountId: string) => Promise<string | null>>(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth, signIn: mocks.signIn, signOut: vi.fn() }));
vi.mock("@/lib/billingRepository", () => ({ openCustomerPortalSession: mocks.openCustomerPortalSession }));
import { openCustomerPortal, signInAgainToDelete } from "./actions";

const FAILED = { unexpectedFailure: expect.stringMatching(/^[0-9a-f]{8}$/) };
const STUDENT = "6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b";

beforeEach(() => {
  vi.clearAllMocks();
});

it("Sign in again shows the Google account chooser and returns to the deletion form", async () => {
  await signInAgainToDelete();
  expect(mocks.signIn).toHaveBeenCalledWith("google", { redirectTo: "/account#delete-account" }, { prompt: "select_account" });
});

describe("Manage plan on Stripe", () => {
  it("sends a student to their Customer Portal session", async () => {
    mocks.auth.mockResolvedValue({ user: { id: STUDENT, role: "student" } });
    mocks.openCustomerPortalSession.mockResolvedValue("https://billing.stripe.com/p/session/test_1");
    await expect(openCustomerPortal()).rejects.toMatchObject({ digest: expect.stringContaining("https://billing.stripe.com/p/session/test_1") });
    expect(mocks.openCustomerPortalSession).toHaveBeenCalledWith(STUDENT);
  });

  it.each([
    ["an admin", { user: { id: STUDENT, role: "admin" } }],
    ["a signed-out visitor", null],
  ])("opens no Customer Portal for %s", async (_who, session) => {
    mocks.auth.mockResolvedValue(session);
    expect(await openCustomerPortal()).toEqual(FAILED);
    expect(mocks.openCustomerPortalSession).not.toHaveBeenCalled();
  });

  it("answers with a failure code when the student has no plan to manage", async () => {
    mocks.auth.mockResolvedValue({ user: { id: STUDENT, role: "student" } });
    mocks.openCustomerPortalSession.mockResolvedValue(null);
    expect(await openCustomerPortal()).toEqual(FAILED);
  });
});
