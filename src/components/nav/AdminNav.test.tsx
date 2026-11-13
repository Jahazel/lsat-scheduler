// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ pathname: "/admin", prefetch: vi.fn() }));
vi.mock("@/app/admin/test/actions", () => ({ rebuildThisWeek: vi.fn(), resetTestData: vi.fn(), resetEverything: vi.fn(), setSimulatedDate: vi.fn(), generateTestSample: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: mocks.prefetch }) }));

import AdminNav from "./AdminNav";
import StudentNav, { StudentTabBar } from "./StudentNav";
import { FailureToastProvider } from "@/components/FailureNotice";
import type { FailureCode } from "@/lib/unexpectedFailure";

const props = {
  name: "Quinn Avery", initials: "QA", email: "qa@example.test", countdownLabel: "30 days to test",
  isTestDay: false, uploadNeeded: true, logOut: async () => ({ goTo: "/?signedOut=1" as const }),
};

describe("admin navigation", () => {
  beforeEach(() => { mocks.pathname = "/admin"; });

  it.each(["/admin", "/admin/students/real-student"])("shows All students without student tabs on %s", (path) => {
    mocks.pathname = path;
    const markup = renderToStaticMarkup(<AdminNav {...props} />);
    expect(markup).toContain("All students");
    expect(markup).not.toContain('href="/settings"');
    expect(markup).not.toContain("days to test");
  });

  it.each(["/dashboard", "/progress", "/settings", "/onboarding", "/account"])("shows My student side and student navigation on %s", (path) => {
    mocks.pathname = path;
    const markup = renderToStaticMarkup(<AdminNav {...props} />);
    expect(markup).toContain("My student side");
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('href="/progress"');
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain('data-workspace-tabs="true"');
    expect(markup).toContain('data-workspace-separator="true"');
  });

  it.each(["/", "/legal/terms", "/issue-47-preview"])("keeps the chosen switcher label and no current option outside workspaces on %s", (path) => {
    mocks.pathname = path;
    const markup = renderToStaticMarkup(<AdminNav {...props} />);
    expect(markup).toContain("All students");
    expect(markup).not.toContain('aria-current="true"');
  });

  it("does not add the workspace separator to a real student's header", () => {
    const markup = renderToStaticMarkup(<StudentNav {...props} />);
    expect(markup).not.toContain("data-workspace-separator");
    expect(markup).not.toContain("/</span>");
  });

  it("uses the shared lg breakpoint for workspace navigation and page padding", () => {
    mocks.pathname = "/dashboard";
    const markup = renderToStaticMarkup(<AdminNav {...props} />);
    expect(markup).toContain("lg:hidden");
    expect(markup).toContain("lg:block");
  });
});

// A null relatedTarget models Safari clicking a link without focusing it.
describe("workspace switcher interactions", () => {
  beforeEach(() => { mocks.pathname = "/admin"; });
  it("keeps an option clickable when pointer interaction blurs the trigger without a focus target", async () => {
    render(<AdminNav {...props} />);
    const trigger = screen.getByRole("button", { name: "All students" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.blur(trigger, { relatedTarget: null });
    const option = screen.getByRole("link", { name: /My student side/ });
    expect(option.getAttribute("href")).toBe("/dashboard");
    // jsdom cannot navigate; browser QA checks the actual route transition.
    option.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(option);
    expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
  });

  it("allows keyboard access to options and Escape returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<AdminNav {...props} />);
    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "All students" });
    expect(document.activeElement).toBe(trigger);
    await user.keyboard("{Enter}");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: /All students/ }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: /My student side/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on document Escape after a mouse click and returns focus to the trigger", () => {
    render(<AdminNav {...props} />);
    const trigger = screen.getByRole("button", { name: "All students" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("marks the current workspace with a check icon", () => {
    render(<AdminNav {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "All students" }));
    const current = screen.getByRole("link", { name: /All students/ });
    const other = screen.getByRole("link", { name: /My student side/ });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.querySelector("svg")).not.toBeNull();
    expect(other.hasAttribute("aria-current")).toBe(false);
    expect(other.querySelector("svg")).toBeNull();
  });

  it("closes when Tab leaves the switcher", async () => {
    const user = userEvent.setup();
    render(<AdminNav {...props} />);
    await user.click(screen.getByRole("button", { name: "All students" }));
    await user.tab();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Log out" }));
    expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
  });

  it("closes on an outside pointer press even without a focus target", () => {
    render(<AdminNav {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "All students" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
  });
});

describe("admin simulated date", () => {
  const testState = { date: "2026-10-07", realDate: "2026-09-27", weekStartDate: "2026-10-05", simulated: true, onboarded: true, weekHasSchedule: true, uploadWeekHasSchedule: true, uploadWeekend: false };
  beforeEach(() => { mocks.pathname = "/dashboard"; });

  it("sits under the header, at the top of the page column, and opens the live test controls", () => {
    render(<AdminNav {...props} testState={testState} />);
    const header = screen.getByRole("banner");
    const chip = screen.getByRole("button", { name: /Admin date:\s*Oct 7, 2026\s*·\s*Change/ });
    const slideOver = screen.getByRole("dialog", { hidden: true });
    expect(header.contains(chip)).toBe(false);
    expect(header.contains(slideOver)).toBe(false);
    expect(chip.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.queryByRole("complementary", { name: "Test controls" })).toBeNull();
  });

  it("is absent on the admin side", () => {
    mocks.pathname = "/admin";
    render(<AdminNav {...props} testState={testState} />);
    expect(screen.queryByRole("button", { name: /Admin date/ })).toBeNull();
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

  it("shows the waiting ring on the admin bar's Log out while it signs out", async () => {
    mocks.pathname = "/admin";
    render(<FailureToastProvider><AdminNav {...props} logOut={waitingLogOut} /></FailureToastProvider>);
    const logOut = screen.getByRole("button", { name: "Log out" });
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
