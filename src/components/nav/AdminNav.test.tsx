// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mocks = vi.hoisted(() => ({ pathname: "/admin", prefetch: vi.fn() }));
vi.mock("@/app/admin/test/actions", () => ({ resetEverything: vi.fn(), setSimulatedDate: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: mocks.prefetch }) }));

import AdminNav from "./AdminNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { FailureToastProvider } from "@/components/FailureNotice";
import type { FailureCode } from "@/lib/unexpectedFailure";

const props = {
  name: "Quinn Avery", initials: "QA", email: "qa@example.test", countdownLabel: "30 days to test",
  isTestDay: false, uploadNeeded: true, logOut: async () => ({ goTo: "/?signedOut=1" as const }),
};

const adminTabs = (name: string) => screen.getAllByRole("navigation", { name }).map((nav) => within(nav).getAllByRole("link"));
const currentLinks = () => screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
const sideSwitches = () => screen.getAllByRole("group", { name: "Side" });

describe("admin tabs", () => {
  beforeEach(() => { mocks.pathname = "/admin"; });

  it.each([
    ["/admin", "/admin"],
    ["/admin/students/real-student", "/admin"],
    ["/admin/lab", "/admin/lab"],
  ])("on %s marks the tab for %s as current, in the top bar and the phone tab bar", (path, href) => {
    mocks.pathname = path;
    render(<AdminNav {...props} />);
    const [bar, phone] = adminTabs("Admin");
    expect(bar.map((tab) => [tab.textContent, tab.getAttribute("href")])).toEqual([["Students", "/admin"], ["Schedule lab", "/admin/lab"]]);
    expect(phone.map((tab) => [tab.textContent, tab.getAttribute("href")])).toEqual([["Students", "/admin"], ["Lab", "/admin/lab"]]);
    expect(currentLinks()).toHaveLength(2);
    for (const tab of currentLinks()) expect(tab.getAttribute("href")).toBe(href);
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
  });

  it("shows no student tabs or test countdown on admin pages", () => {
    render(<AdminNav {...props} />);
    expect(screen.queryByRole("link", { name: /Study settings|Settings/ })).toBeNull();
    expect(screen.queryByText("30 days to test")).toBeNull();
  });
});

describe("Admin / Student switch", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.pathname = "/admin";
  });

  it("on admin pages marks Admin and links the Student side to the admin's own This week", () => {
    render(<AdminNav {...props} />);
    for (const group of sideSwitches()) {
      expect(within(group).getByText("Admin").getAttribute("aria-current")).toBe("true");
      expect(within(group).getByRole("link", { name: "Student side" }).getAttribute("href")).toBe("/dashboard");
      expect(within(group).queryByRole("link", { name: "Admin" })).toBeNull();
    }
  });

  it.each(["/dashboard", "/dashboard/upload", "/progress", "/settings", "/account", "/onboarding"])("on %s marks the Student side and keeps the switch", (path) => {
    mocks.pathname = path;
    render(<AdminNav {...props} />);
    for (const group of sideSwitches()) {
      expect(within(group).getByLabelText("Student side").getAttribute("aria-current")).toBe("true");
      expect(within(group).getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");
    }
  });

  it("shows the student tabs on the student side, but not during onboarding", () => {
    mocks.pathname = "/progress";
    const { rerender } = render(<AdminNav {...props} />);
    expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(2);
    expect(screen.queryByRole("navigation", { name: "Admin" })).toBeNull();
    mocks.pathname = "/onboarding";
    rerender(<AdminNav {...props} />);
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Admin" })).toBeNull();
  });

  it("returns to the admin page used last, with the link it had when the admin left", () => {
    history.replaceState(null, "", "/admin/lab");
    mocks.pathname = "/admin/lab";
    const { rerender } = render(<AdminNav {...props} />);
    history.replaceState(null, "", "/admin/lab?preset=steady");
    const studentSide = within(sideSwitches()[1]).getByRole("link", { name: "Student side" });
    // jsdom cannot navigate; browser QA checks the route change.
    studentSide.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(studentSide);
    history.replaceState(null, "", "/dashboard");
    mocks.pathname = "/dashboard";
    rerender(<AdminNav {...props} />);
    for (const group of sideSwitches()) {
      expect(within(group).getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin/lab?preset=steady");
    }
  });

  it.each(["/admin/typo", "/admin/students", "/admin/lab/extra", "/admin/students/real-student/extra"])("does not return to the unknown admin link %s", (unknown) => {
    history.replaceState(null, "", "/admin/lab");
    mocks.pathname = "/admin/lab";
    const { rerender } = render(<AdminNav {...props} />);
    history.replaceState(null, "", unknown);
    mocks.pathname = unknown;
    rerender(<AdminNav {...props} />);
    history.replaceState(null, "", "/dashboard");
    mocks.pathname = "/dashboard";
    rerender(<AdminNav {...props} />);
    expect(within(sideSwitches()[0]).getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin/lab");
  });

  it("remembers an admin page reached without the switch", () => {
    history.replaceState(null, "", "/admin/students/real-student");
    mocks.pathname = "/admin/students/real-student";
    const { rerender } = render(<AdminNav {...props} />);
    history.replaceState(null, "", "/account");
    mocks.pathname = "/account";
    rerender(<AdminNav {...props} />);
    expect(within(sideSwitches()[0]).getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin/students/real-student");
  });
});

describe("admin avatar menu", () => {
  beforeEach(() => { mocks.pathname = "/admin"; });

  it("opens from the avatar with a long name and email", async () => {
    const name = "Maximiliana Alessandra Konstantinopoulou-Vanderbilt";
    const email = "maximiliana.konstantinopoulou.vanderbilt@extremely-long-university-domain.example.edu";
    render(<AdminNav {...props} name={name} email={email} initials="MK" />);
    await userEvent.click(screen.getAllByRole("button", { name: `Account menu for ${email}` })[1]);
    const menu = screen.getByRole("menu", { name: "Account" });
    expect(within(menu).getByText(name)).toBeTruthy();
    expect(within(menu).getByText(email)).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "Account" }).getAttribute("href")).toBe("/account");
    expect(within(menu).getByRole("menuitem", { name: "Log out" })).toBeTruthy();
  });

  it("shows only the email when the admin has no name", async () => {
    render(<AdminNav {...props} name={null} initials="Q" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Account menu for qa@example.test" })[0]);
    const menu = screen.getByRole("menu", { name: "Account" });
    expect(within(menu).getByText("qa@example.test")).toBeTruthy();
    expect(within(menu).queryByText("Quinn Avery")).toBeNull();
  });
});

describe("account menu", () => {
  it("keeps a failed Log out's toast when the menu closes", async () => {
    mocks.pathname = "/dashboard";
    const logOut = async () => ({ unexpectedFailure: "3f9a01c2" as FailureCode });
    render(<FailureToastProvider><StudentNav {...props} logOut={logOut} /></FailureToastProvider>);
    const [menuButton] = screen.getAllByRole("button", { name: "Account menu for qa@example.test" });
    await userEvent.click(menuButton);
    await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    const alert = await screen.findByRole("alert");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("alert")).toBe(alert);
  });
});

describe("Log out waiting", () => {
  let finish = () => {};
  const waitingLogOut = () => new Promise<{ unexpectedFailure: FailureCode }>((resolve) => { finish = () => resolve({ unexpectedFailure: "3f9a01c2" as FailureCode }); });
  const expectWaiting = async (button: HTMLElement) => {
    await vi.waitFor(() => expect(button.getAttribute("aria-disabled")).toBe("true"));
    const waitingIcons = button.querySelectorAll("svg").length;
    finish();
    await vi.waitFor(() => expect(button.hasAttribute("aria-disabled")).toBe(false));
    expect(button.querySelectorAll("svg").length).toBeLessThan(waitingIcons);
  };

  it("shows the waiting ring on the account menu's Log out while it signs out", async () => {
    mocks.pathname = "/dashboard";
    render(<FailureToastProvider><StudentNav {...props} logOut={waitingLogOut} /></FailureToastProvider>);
    await userEvent.click(screen.getAllByRole("button", { name: "Account menu for qa@example.test" })[0]);
    const logOut = screen.getByRole("menuitem", { name: "Log out" });
    await userEvent.click(logOut);
    await expectWaiting(logOut);
  });

  it("shows the waiting ring on the admin avatar menu's Log out while it signs out", async () => {
    mocks.pathname = "/admin";
    render(<FailureToastProvider><AdminNav {...props} logOut={waitingLogOut} /></FailureToastProvider>);
    await userEvent.click(screen.getAllByRole("button", { name: "Account menu for qa@example.test" })[0]);
    const logOut = screen.getByRole("menuitem", { name: "Log out" });
    await userEvent.click(logOut);
    await expectWaiting(logOut);
  });
});

describe("current tab", () => {
  afterEach(() => { mocks.pathname = "/admin"; });

  it.each([
    ["/dashboard", "This week"],
    ["/dashboard/upload", "Upload"],
    ["/progress", "Progress"],
    ["/settings/anything", "Settings"],
  ])("on %s marks only %s, on the top bar and the phone tab bar", (path, short) => {
    mocks.pathname = path;
    render(<><StudentNav {...props} /><StudentTabBar uploadNeeded={false} /></>);
    const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(2);
    for (const tab of current) expect(tab.textContent).toContain(short);
  });

  it("links This week to This week even when an upload is due", () => {
    mocks.pathname = "/progress";
    render(<><StudentNav {...props} uploadNeeded /><StudentTabBar uploadNeeded /></>);
    const thisWeek = screen.getAllByRole("link").filter((link) => link.textContent!.startsWith("This week"));
    expect(thisWeek.map((link) => link.getAttribute("href"))).toEqual(["/dashboard", "/dashboard"]);
  });
});

describe("account menu prefetch", () => {
  beforeEach(() => { mocks.prefetch.mockClear(); });

  it("prefetches Account when the menu opens, so its loading screen shows on a quick tap", async () => {
    mocks.pathname = "/dashboard";
    render(<StudentNav {...props} />);
    expect(mocks.prefetch).not.toHaveBeenCalled();
    const [menuButton] = screen.getAllByRole("button", { name: "Account menu for qa@example.test" });
    await userEvent.click(menuButton);
    expect(mocks.prefetch).toHaveBeenCalledExactlyOnceWith("/account");
    await userEvent.click(menuButton);
    expect(mocks.prefetch).toHaveBeenCalledOnce();
  });
});
