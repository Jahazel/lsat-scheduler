// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ pathname: "/admin" }));
vi.mock("@/app/admin/test/actions", () => ({ rebuildThisWeek: vi.fn(), resetTestData: vi.fn(), resetEverything: vi.fn(), setSimulatedDate: vi.fn(), generateTestSample: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import AdminNav from "./AdminNav";
import StudentNav from "./StudentNav";

const props = {
  initials: "QA", email: "qa@example.test", countdownLabel: "30 days to test",
  isTestDay: false, uploadNeeded: true, logOut: async () => {},
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

  it("marks the current workspace with a check icon distinct from hover", () => {
    render(<AdminNav {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "All students" }));
    const current = screen.getByRole("link", { name: /All students/ });
    const other = screen.getByRole("link", { name: /My student side/ });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.querySelector("svg")).not.toBeNull();
    expect(current.querySelector("span > span")?.className).toContain("font-semibold");
    expect(other.className).toContain("hover:bg-vellum");
    expect(other.querySelector("span > span")?.className).not.toContain("font-semibold");
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

describe("admin test dock", () => {
  const testState = { date: "2026-10-07", realDate: "2026-09-27", weekStartDate: "2026-10-05", simulated: true, onboarded: true, canRebuild: true };
  beforeEach(() => {
    mocks.pathname = "/dashboard";
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps keyboard focus on the matching button when the dock closes and opens", async () => {
    const user = userEvent.setup();
    render(<AdminNav {...props} testState={testState} />);
    const dock = screen.getByRole("complementary", { name: "Test controls" });
    const close = within(dock).getByRole("button", { name: "Close test controls" });
    expect(close.getAttribute("aria-expanded")).toBe("true");
    await user.click(close);
    const expand = within(dock).getByRole("button", { name: /Expand test controls/ });
    expect(document.activeElement).toBe(expand);
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(within(dock).getByRole("button", { name: "Close test controls" }));
  });

  // The closed dock fills its strip, which clips anything drawn outside it.
  it("draws the closed dock's focus ring inside the strip", async () => {
    const user = userEvent.setup();
    render(<AdminNav {...props} testState={testState} />);
    const dock = screen.getByRole("complementary", { name: "Test controls" });
    await user.click(within(dock).getByRole("button", { name: "Close test controls" }));
    const classes = within(dock).getByRole("button", { name: /Expand test controls/ }).className.split(" ");
    expect(classes).toContain("focus-visible:-outline-offset-2");
    expect(classes).not.toContain("focus-visible:outline-offset-2");
  });

  it("names the closed dock with its visible simulated date", async () => {
    const user = userEvent.setup();
    render(<AdminNav {...props} testState={testState} />);
    const dock = screen.getByRole("complementary", { name: "Test controls" });
    await user.click(within(dock).getByRole("button", { name: "Close test controls" }));
    expect(within(dock).getByRole("button", { name: "Simulated Oct 7, 2026 Expand test controls" })).toBeDefined();
  });

  it("places the dock and slide-over outside the header and keeps the mobile opener inside it", () => {
    render(<AdminNav {...props} testState={testState} />);
    const header = screen.getByRole("banner");
    const dock = screen.getByRole("complementary", { name: "Test controls" });
    const slideOver = screen.getByRole("dialog", { hidden: true });
    const opener = screen.getByRole("button", { name: /Open test controls/ });
    expect(header.contains(dock)).toBe(false);
    expect(header.contains(slideOver)).toBe(false);
    expect(header.contains(opener)).toBe(true);
    expect(opener.getAttribute("aria-controls")).toBe(slideOver.id);
  });
});
