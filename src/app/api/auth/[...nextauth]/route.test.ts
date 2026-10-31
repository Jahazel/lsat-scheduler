import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ authGet: vi.fn(), record: vi.fn() }));

vi.mock("@/auth", () => ({ handlers: { GET: mocks.authGet, POST: vi.fn() } }));
vi.mock("@/lib/securityLog", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/securityLog")>(),
  recordSecurityEvent: mocks.record,
}));

const SITE = "https://drillmap.test";

async function googleReturns(query: string, loginQuery: string) {
  mocks.authGet.mockResolvedValue(Response.redirect(`${SITE}/login?${loginQuery}`, 302));
  const { GET } = await import("./route");
  const response = await GET(new NextRequest(`${SITE}/api/auth/callback/google?${query}`));
  expect(response.headers.get("Location")).toBe(`${SITE}/login?${loginQuery}`);
  return mocks.record.mock.calls.map(([entry]) => entry);
}

beforeEach(() => {
  mocks.authGet.mockReset();
  mocks.record.mockReset();
});

it("records a cancel at Google as a cancel, though Login gets error=Configuration", async () => {
  expect(await googleReturns("error=access_denied&state=s", "error=Configuration")).toEqual([
    { event: "sign_in", result: "googleCancelled", route: "/api/auth/callback/google", who: { nobody: true } },
  ]);
});

it("records a cancel the same way when Auth.js names it OAuthCallbackError", async () => {
  expect(await googleReturns("error=access_denied&state=s", "error=OAuthCallbackError")).toEqual([
    expect.objectContaining({ event: "sign_in", result: "googleCancelled" }),
  ]);
});

it.each([
  ["a failed token exchange", "code=c&state=s"],
  ["any other error from Google", "error=unauthorized_client&state=s"],
])("records %s as a setup fault", async (_case, query) => {
  expect(await googleReturns(query, "error=Configuration")).toEqual([
    { event: "sign_in", result: "setupFault", route: "/api/auth/callback/google", who: { nobody: true } },
  ]);
});

it("adds nothing when the sign-in callback ran and logged its own result", async () => {
  expect(await googleReturns("code=c&state=s", "error=AccessDenied")).toEqual([]);
  expect(await googleReturns("code=c&state=s", "error=AccountDisabled")).toEqual([]);
});

it("adds nothing for other Auth.js pages", async () => {
  mocks.authGet.mockResolvedValue(Response.redirect(`${SITE}/login?error=Configuration`, 302));
  const { GET } = await import("./route");
  await GET(new NextRequest(`${SITE}/api/auth/signin/google?error=access_denied`));
  expect(mocks.record).not.toHaveBeenCalled();
});
