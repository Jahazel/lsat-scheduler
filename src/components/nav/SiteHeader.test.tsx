import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUser: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/User", () => ({ UserModel: { findById: mocks.findUser } }));
vi.mock("@/models/Student", () => ({ StudentModel: { findOne: () => ({ lean: async () => null }) } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
import SiteHeader from "./SiteHeader";
describe("header's verified admin clock", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } }); });
  it("uses one verified user record for the simulated date and controls", async () => {
    mocks.findUser.mockReturnValue({ lean: async () => ({ role: "admin", simulatedDate: "2026-10-07" }) });
    const markup = renderToStaticMarkup(await SiteHeader());
    expect(markup).toContain("Oct 7");
    expect(mocks.findUser).toHaveBeenCalledOnce();
  });
  it("does not show simulated-date controls for a stale admin session", async () => {
    mocks.findUser.mockReturnValue({ lean: async () => ({ role: "student", simulatedDate: "2026-10-07" }) });
    const markup = renderToStaticMarkup(await SiteHeader());
    expect(markup).not.toContain("Oct 7");
    expect(markup).not.toContain("Test controls");
  });
});
