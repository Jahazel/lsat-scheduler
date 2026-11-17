import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`redirect ${to}`); },
  notFound: () => { throw new Error("not found"); },
}));

import AdminPage from "./page";
import AdminStudentPage from "./students/[id]/page";
import ScheduleLabPage from "./lab/page";
import UnknownAdminPage from "./[...rest]/page";

const params = Promise.resolve({ id: "real-student" });
const pages = [
  ["/admin", () => AdminPage()],
  ["/admin/students/real-student", () => AdminStudentPage({ params, searchParams: Promise.resolve({}) })],
  ["/admin/lab", () => ScheduleLabPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })],
  ["/admin/anything/else", () => UnknownAdminPage()],
] as const;

describe("admin pages for anyone who is not an admin", () => {
  beforeEach(() => mocks.auth.mockReset());

  it.each(pages)("send a standard student opening %s to their own This week", async (_path, open) => {
    mocks.auth.mockResolvedValue({ user: { id: "student-1", role: "student" } });
    await expect(open()).rejects.toThrow("redirect /dashboard");
  });

  it.each(pages)("send a signed-out visitor opening %s through This week", async (_path, open) => {
    mocks.auth.mockResolvedValue(null);
    await expect(open()).rejects.toThrow("redirect /dashboard");
  });
});

describe("admin pages for an admin", () => {
  beforeEach(() => mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } }));

  it("opens the Schedule lab on Steady, built", async () => {
    const page = renderToStaticMarkup(await ScheduleLabPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }));
    expect(page).toContain("Schedule lab");
    expect(page).toContain("Planned from Steady sample");
  });

  it("shows Not found for an unknown admin link", async () => {
    await expect(UnknownAdminPage()).rejects.toThrow("not found");
  });
});
