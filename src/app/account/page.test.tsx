import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findStudent: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/studentRepository", () => ({ findStudentByAccountId: mocks.findStudent }));
vi.mock("./actions", () => ({ deleteAccount: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import AccountPage from "./page";

describe("Account", () => {
  beforeEach(() => {
    mocks.findStudent.mockResolvedValue({ id: "own-student" });
  });

  it.each(["student", "admin"])("shows the %s's email and offers deletion only to students", async (role) => {
    mocks.auth.mockResolvedValue({ user: { id: "own-user", email: "owner@example.test", role } });
    const markup = renderToStaticMarkup(await AccountPage());
    expect(markup).toContain("owner@example.test");
    expect(markup.includes("Delete account")).toBe(role === "student");
  });
});
