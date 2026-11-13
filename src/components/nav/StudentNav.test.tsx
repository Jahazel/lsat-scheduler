// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initialsFor } from "@/lib/studentNav";
import { testCountdown, testCountdownLabel } from "@/lib/testCountdown";

const mocks = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

import StudentNav, { StudentTabBar, type StudentNavProps } from "./StudentNav";

afterEach(() => { cleanup(); mocks.pathname = "/dashboard"; });

const props: StudentNavProps = {
  name: "Dana Rivers", initials: "DR", email: "dana@example.test", countdownLabel: "61 days to test",
  isTestDay: false, uploadNeeded: false, logOut: async () => ({ goTo: "/?signedOut=1" as const }),
};

const desktopTabs = () => within(screen.getAllByRole("navigation", { name: "Primary" })[0]!).getAllByRole("link");

async function openMenu() {
  await userEvent.click(screen.getAllByRole("button", { name: `Account menu for ${props.email}` })[0]!);
  return screen.getAllByRole("menu", { name: "Account" }).find((menu) => !menu.hidden)!;
}

describe("top bar tabs", () => {
  it("shows the four tabs in order, words only", () => {
    render(<StudentNav {...props} />);
    expect(desktopTabs().map((tab) => [tab.getAttribute("href"), tab.querySelector("svg")])).toEqual([
      ["/dashboard", null], ["/dashboard/upload", null], ["/progress", null], ["/settings", null],
    ]);
    expect(desktopTabs().map((tab) => tab.textContent))
      .toEqual(["This weekThis week", "UploadWeekly upload", "ProgressProgress", "SettingsStudy settings"]);
  });

  it("marks Weekly upload with a dot that reads \"analytics upload needed\" when an upload is due", () => {
    render(<><StudentNav {...props} uploadNeeded /><StudentTabBar uploadNeeded /></>);
    const uploads = screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/dashboard/upload");
    expect(uploads).toHaveLength(2);
    expect(uploads.map((upload) => upload.textContent)).toEqual([
      "UploadWeekly upload analytics upload needed",
      "Upload analytics upload needed",
    ]);
    const others = screen.getAllByRole("link").filter((link) => link.getAttribute("href") !== "/dashboard/upload");
    for (const other of others) expect(other.textContent).not.toContain("analytics upload needed");
  });

  it("has no dot when no upload is due", () => {
    render(<><StudentNav {...props} /><StudentTabBar uploadNeeded={false} /></>);
    expect(document.body.textContent).not.toContain("analytics upload needed");
  });
});

describe("phone tab bar", () => {
  it("has four tabs with their short words and an icon each", () => {
    render(<StudentTabBar uploadNeeded={false} />);
    const tabs = screen.getAllByRole("link");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["This week", "Upload", "Progress", "Settings"]);
    for (const tab of tabs) expect(tab.querySelector("svg")).not.toBeNull();
    expect(tabs[0]!.getAttribute("aria-current")).toBe("page");
  });
});

describe("countdown chip", () => {
  const goal = "2026-11-20";
  const at = (date: string) => testCountdownLabel(testCountdown(goal, new Date(`${date}T18:00:00Z`), "America/Chicago"));
  const chip = () => screen.queryByText(/ to test$|^Test day$/);

  it.each([
    ["2026-11-10", "10 days to test"],
    ["2026-11-19", "1 day to test"],
    ["2026-11-20", "Test day"],
  ])("on %s reads %s", (date, words) => {
    render(<StudentNav {...props} countdownLabel={at(date)} isTestDay={words === "Test day"} />);
    expect(chip()?.textContent).toBe(words);
  });

  it("is hidden once the test date has passed", () => {
    expect(at("2026-11-21")).toBeNull();
    render(<StudentNav {...props} countdownLabel={at("2026-11-21")} />);
    expect(chip()).toBeNull();
  });

  it("stays out of the phone top bar and the menu", async () => {
    render(<StudentNav {...props} />);
    expect(screen.getAllByText("61 days to test")).toHaveLength(1);
    expect((await openMenu()).textContent).not.toContain("days to test");
  });
});

describe("user menu", () => {
  it("shows the name, the email, Account, and Log out", async () => {
    render(<StudentNav {...props} />);
    const menu = await openMenu();
    expect(within(menu).getByText("Dana Rivers")).toBeTruthy();
    expect(within(menu).getByText("dana@example.test")).toBeTruthy();
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Account", "Log out"]);
    expect(within(menu).getByRole("menuitem", { name: "Account" }).getAttribute("href")).toBe("/account");
  });

  it("shows the email only when the student has no name", async () => {
    render(<StudentNav {...props} name={null} initials={initialsFor(null, props.email)} />);
    const menu = await openMenu();
    const card = within(menu).getByText("dana@example.test").parentElement!;
    expect(card.textContent).toBe("dana@example.test");
  });

  it.each([
    ["🎉 Party Person", "🎉P"],
    ["山田 太郎", "山太"],
    ["Zoë", "ZO"],
  ])("shows whole initials for %s on the avatar", (name, initials) => {
    render(<StudentNav {...props} name={name} initials={initialsFor(name, props.email)} />);
    const avatar = screen.getAllByRole("button", { name: `Account menu for ${props.email}` })[0]!;
    expect(avatar.textContent).toBe(initials);
  });

  it("closes on Escape and returns focus to the avatar", async () => {
    render(<StudentNav {...props} />);
    await openMenu();
    await userEvent.keyboard("{Escape}");
    expect(screen.getAllByRole("menu", { hidden: true }).every((menu) => menu.hidden)).toBe(true);
    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: `Account menu for ${props.email}` })[0]);
  });
});

