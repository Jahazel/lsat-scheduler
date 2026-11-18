// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard", refresh: vi.fn(), push: vi.fn(),
  setSimulatedDate: vi.fn(), resetEverything: vi.fn(),
}));
vi.mock("@/app/admin/test/actions", () => ({ setSimulatedDate: mocks.setSimulatedDate, resetEverything: mocks.resetEverything }));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, prefetch: vi.fn() }),
}));

import AdminNav from "./AdminNav";
import type { WalkthroughFacts } from "@/lib/walkthrough";

const props = {
  name: "Quinn Avery", initials: "QA", email: "qa@example.test", countdownLabel: null,
  isTestDay: false, uploadNeeded: false, logOut: async () => ({ goTo: "/?signedOut=1" as const }),
};
const REAL: WalkthroughFacts = { today: "2026-11-16", realDate: "2026-11-16", simulated: false, scheduledWeeks: ["2026-11-16"] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const dateButton = () => within(screen.getAllByRole("group", { name: "Side" })[0]).getByRole("button", { name: /^Student side, / });
const card = () => screen.getByRole("region", { name: "Walkthrough" });
async function openCard(facts = REAL) {
  render(<AdminNav {...props} walkthrough={facts} />);
  await userEvent.click(dateButton());
  return card();
}
const jumpRows = () => within(card()).getAllByRole("button", { name: /^(Next day|Saturday|Monday):/ }).map((button) => button.getAttribute("aria-label"));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/dashboard";
});

describe("the date in the switch", () => {
  it("shows the student side's date as the Student segment, and opens the card under it with focus on the card", async () => {
    render(<AdminNav {...props} walkthrough={REAL} />);
    const date = dateButton();
    expect(date.getAttribute("aria-label")).toBe("Student side, real date Mon, Nov 16. Walkthrough");
    expect(date.getAttribute("aria-current")).toBe("true");
    expect(date.getAttribute("aria-expanded")).toBe("false");
    expect(date.textContent).toContain("Nov 16");
    await userEvent.click(date);
    expect(date.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(card());
  });

  it("is not on admin pages", () => {
    mocks.pathname = "/admin";
    render(<AdminNav {...props} walkthrough={REAL} />);
    expect(screen.queryByRole("button", { name: /^Student side, / })).toBeNull();
  });

  it("replaces the Test controls chip", () => {
    render(<AdminNav {...props} walkthrough={REAL} />);
    expect(screen.queryByRole("button", { name: /Test controls|Admin date|Real date:/ })).toBeNull();
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });
});

describe("the card's date", () => {
  it("reads Real date on the real date", async () => {
    const region = await openCard();
    expect(within(region).getByText("Real date")).toBeTruthy();
    expect(within(region).getByRole("heading", { name: "Monday, November 16" })).toBeTruthy();
  });

  it("reads Simulated with the real date on a simulated date", async () => {
    const region = await openCard({ ...REAL, today: "2026-11-19", simulated: true });
    expect(dateButton().getAttribute("aria-label")).toBe("Student side, simulated date Thu, Nov 19. Walkthrough");
    expect(within(region).getByText("Simulated · real date Mon, Nov 16")).toBeTruthy();
    expect(within(region).getByRole("heading", { name: "Thursday, November 19" })).toBeTruthy();
  });
});

describe("named jumps", () => {
  it("lists Next day, Saturday, and Monday with their dates", async () => {
    await openCard();
    expect(jumpRows()).toEqual([
      "Next day: Tue, Nov 17",
      "Saturday: Weekly upload opens · Nov 21",
      "Monday: New week starts · Nov 23",
    ]);
  });

  it.each([
    ["2026-11-20", ["Next day: Sat, Nov 21 · Weekly upload opens", "Monday: New week starts · Nov 23"]],
    ["2026-11-22", ["Next day: Mon, Nov 23 · New week starts", "Saturday: Weekly upload opens · Nov 28"]],
  ])("names Saturday or Monday in one Next day row when tomorrow is that day (%s)", async (today, rows) => {
    await openCard({ ...REAL, today, simulated: true });
    expect(jumpRows()).toEqual(rows);
  });

  it("moves only the date, turns the controls off with Moving…, then reloads the real page and says where it moved", async () => {
    const answer = deferred<undefined>();
    mocks.setSimulatedDate.mockReturnValue(answer.promise);
    await openCard();
    await userEvent.click(within(card()).getByRole("button", { name: /^Next day:/ }));
    expect(mocks.setSimulatedDate).toHaveBeenCalledExactlyOnceWith("2026-11-17");
    expect(within(card()).getByRole("status").textContent).toBe("Moving…");
    for (const button of within(card()).getAllByRole("button", { name: /^(Next day|Saturday|Monday):|^Start over$/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    await act(async () => answer.resolve(undefined));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(within(card()).getByRole("status").textContent).toBe("Moved to Tue, Nov 17.");
  });

  it("says Something went wrong when a move fails, and keeps the date", async () => {
    mocks.setSimulatedDate.mockResolvedValue({ unexpectedFailure: "3f9a01c2" });
    await openCard();
    await userEvent.click(within(card()).getByRole("button", { name: /^Saturday:/ }));
    expect(within(card()).getByRole("status").textContent).toBe("Something went wrong. Try again.");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect((within(card()).getByRole("button", { name: /^Saturday:/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Pick a day", () => {
  it("opens a Monday-first month: past days and today off, later days up to 56 days ahead on, a dot on weeks with a schedule", async () => {
    mocks.setSimulatedDate.mockResolvedValue(undefined);
    const region = await openCard();
    const toggle = within(region).getByRole("button", { name: "Pick a day" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const month = within(region).getByRole("group", { name: "November 2026" });
    const day = (name: string | RegExp) => within(month).getByRole("button", { name }) as HTMLButtonElement;
    expect(day("Sun, Nov 15, not available").disabled).toBe(true);
    expect(day(/^Mon, Nov 16, today/).disabled).toBe(true);
    expect(day("Move to Tue, Nov 17, week has a schedule").disabled).toBe(false);
    expect(day("Move to Mon, Nov 23").disabled).toBe(false);
    expect((within(region).getByRole("button", { name: "Earlier month" }) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(within(region).getByRole("button", { name: "Later month" }));
    await userEvent.click(within(region).getByRole("button", { name: "Later month" }));
    const january = within(region).getByRole("group", { name: "January 2027" });
    expect((within(january).getByRole("button", { name: "Move to Mon, Jan 11" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(january).getByRole("button", { name: "Tue, Jan 12, not available" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(region).getByRole("button", { name: "Later month" }) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(within(january).getByRole("button", { name: "Move to Mon, Jan 11" }));
    expect(mocks.setSimulatedDate).toHaveBeenCalledExactlyOnceWith("2027-01-11");
  });
});

describe("Start over", () => {
  it("lists what it deletes and keeps, then lands on onboarding with Starting over… while it runs", async () => {
    const answer = deferred<undefined>();
    mocks.resetEverything.mockReturnValue(answer.promise);
    await openCard({ ...REAL, today: "2026-11-19", simulated: true });
    await userEvent.click(within(card()).getByRole("button", { name: "Start over" }));
    const confirm = within(card()).getByRole("group", { name: "Start over: confirm" });
    expect(confirm.textContent).toContain("Deletes all weekly schedules, activity check-ins, analytics snapshots, practice-test results and study settings on your student side.");
    expect(confirm.textContent).toContain("Keeps your admin account.");
    expect(document.activeElement).toBe(within(confirm).getByRole("button", { name: "Cancel" }));

    await userEvent.click(within(confirm).getByRole("button", { name: "Confirm start over" }));
    expect(mocks.resetEverything).toHaveBeenCalledOnce();
    expect(within(confirm).getByRole("button", { name: "Starting over…" })).toBeTruthy();
    expect(within(card()).getByRole("status").textContent).toBe("Starting over…");
    await act(async () => answer.resolve(undefined));
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/onboarding");
  });

  it("Cancel folds the confirmation and returns focus to Start over", async () => {
    await openCard();
    await userEvent.click(within(card()).getByRole("button", { name: "Start over" }));
    await userEvent.click(within(card()).getByRole("button", { name: "Cancel" }));
    expect(within(card()).queryByRole("group", { name: "Start over: confirm" })).toBeNull();
    expect(document.activeElement).toBe(within(card()).getByRole("button", { name: "Start over" }));
    expect(mocks.resetEverything).not.toHaveBeenCalled();
  });
});

describe("closing the card", () => {
  it.each([
    ["×", () => userEvent.click(within(card()).getByRole("button", { name: "Close Walkthrough" }))],
    ["Escape", () => userEvent.keyboard("{Escape}")],
    ["a tap outside", async () => { fireEvent.pointerDown(document.body); }],
    ["the date again", () => userEvent.click(dateButton())],
  ])("closes on %s and returns focus to the date", async (_, close) => {
    await openCard();
    await close();
    expect(screen.queryByRole("region", { name: "Walkthrough" })).toBeNull();
    expect(document.activeElement).toBe(dateButton());
    expect(dateButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open on a tap inside the card", async () => {
    await openCard();
    fireEvent.pointerDown(within(card()).getByRole("heading", { level: 2 }));
    expect(card()).toBeTruthy();
  });
});
