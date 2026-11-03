// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findAccount: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: vi.fn() }));
vi.mock("@/lib/accountRepository", () => ({ findAccountById: mocks.findAccount }));
vi.mock("@/lib/studentRepository", () => ({ findStudentByAccountId: async () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
import SiteHeader from "./SiteHeader";
describe("signed-out header", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(null); });
  it("is the landing top bar: section links, Log in, and Start free week", async () => {
    const page = document.createElement("div");
    page.innerHTML = renderToStaticMarkup(await SiteHeader());
    const links = [...page.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]);
    expect(links).toEqual([
      ["DrillMap", "/"],
      ["How it works", "/#how-it-works"],
      ["Pricing", "/#pricing"],
      ["Log in", "/login"],
      ["Start free week", "/signup"],
    ]);
    expect(page.textContent).not.toContain("Sign up");
  });
});
describe("header's verified admin clock", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } }); });
  it("uses one verified Account record for the simulated date and controls", async () => {
    mocks.findAccount.mockResolvedValue({ role: "admin", simulatedDate: "2026-10-07" });
    const markup = renderToStaticMarkup(await SiteHeader());
    expect(markup).toContain("Oct 7");
    expect(mocks.findAccount).toHaveBeenCalledOnce();
  });
  it("does not show simulated-date controls for a stale admin session", async () => {
    mocks.findAccount.mockResolvedValue({ role: "student", simulatedDate: "2026-10-07" });
    const markup = renderToStaticMarkup(await SiteHeader());
    expect(markup).not.toContain("Oct 7");
    expect(markup).not.toContain("Test controls");
  });
});
