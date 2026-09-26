// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ pathname: "/admin" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

import AdminNav from "./AdminNav";

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
