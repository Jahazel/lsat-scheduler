// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LIST_START, listQuery, type ListState, type StudentRow } from "@/lib/studentList";
import { StudentsLedger } from "./StudentsLedger";

const next = vi.hoisted(() => ({ link: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(next.link) }));

afterEach(cleanup);
beforeEach(() => window.history.replaceState(null, "", "/admin"));

const row = (name: string, extra: Partial<StudentRow> = {}): StudentRow => ({
  id: `id-${name || "blank"}`,
  name,
  email: `${name.toLowerCase() || "blank"}@example.test`,
  plan: "paid",
  needsAnalytics: false,
  thisWeek: "ready",
  weeklyMinutes: 570,
  goalTestDate: "2027-02-01",
  joinedAt: new Date("2026-11-09T18:00:00Z"),
  ...extra,
});

const ROWS = [
  row("Maya"),
  row("Daniel", { plan: "free_week", needsAnalytics: true }),
  row("Priya", { plan: "retrying" }),
  row("Lucas", { plan: "lapsed", thisWeek: "none" }),
];

function show(link: Partial<ListState> = {}, rows = ROWS) {
  const query = listQuery({ ...LIST_START, ...link });
  window.history.replaceState(null, "", `/admin${query}`);
  next.link = query.slice(1);
  return render(<StudentsLedger rows={rows} upcomingTestMonthCount={4} />);
}
const NAMES = /^(Maya|Daniel|Priya|Lucas|Old|New)$/;
const shownNames = () => within(screen.getByRole("table")).getAllByText(NAMES).map((name) => name.textContent);
const counts = () => screen.getByText((_, element) => element?.tagName === "P" && /on a paid plan/.test(element.textContent ?? "")).textContent;

describe("Students", () => {
  it("shows the overview counts in one line", () => {
    show();
    expect(counts()).toBe(
      "4 students1 on a paid plan1 in a free week2 retrying or lapsed1 needs analytics3 have this week's schedule",
    );
  });

  it("shows each student's plan, analytics, this week, study time, test month, and join day, and links to their page", () => {
    show({}, [row("Daniel", { plan: "free_week", needsAnalytics: true })]);
    const cells = within(screen.getByRole("table")).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["Danieldaniel@example.test", "Free week", "Needed", "Ready", "9 h 30 min", "Feb 2027", "Nov 9"]);
    expect(within(screen.getByRole("table")).getByRole("link")).toHaveProperty("pathname", "/admin/students/id-Daniel");
    expect(within(screen.getByRole("list")).getByRole("link").textContent).toBe("DanielNeeds analyticsFree weekdaniel@example.test · 9 h 30 min per week");
  });

  it("shows Held for a held week in the table and the phone and tablet rows, and None in the table only", () => {
    show({}, [row("Daniel", { plan: "free_week", thisWeek: "held" }), row("Lucas", { plan: "lapsed", thisWeek: "none" })]);
    const thisWeek = within(screen.getByRole("table")).getAllByRole("row").slice(1).map((tr) => within(tr).getAllByRole("cell")[3].textContent);
    expect(thisWeek).toEqual(["Held", "None"]);
    expect(within(screen.getByRole("list")).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "DanielFree weekHelddaniel@example.test · 9 h 30 min per week",
      "LucasLapsedlucas@example.test · 9 h 30 min per week",
    ]);
  });

  it("carries the list's search, filter, and sort into each student's link, so ← All students returns to them", async () => {
    const user = userEvent.setup();
    show({ sort: "newest" });
    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "pri");
    const links = screen.getAllByRole("link", { name: /Priya/ }).map((link) => link.getAttribute("href"));
    expect(links).toEqual(["/admin/students/id-Priya?q=pri&sort=newest", "/admin/students/id-Priya?q=pri&sort=newest"]);
  });

  it("says when no student has onboarded, with zero counts and no search", () => {
    show({}, []);
    expect(screen.getByText("No students have completed onboarding yet.")).toBeTruthy();
    expect(counts()).toMatch(/^0 students0 on a paid plan/);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("names a student with no name", () => {
    show({}, [row("")]);
    expect(within(screen.getByRole("table")).getByRole("link").textContent).toBe("No nameblank@example.test");
  });

  it("search narrows the list and keeps the search in the page link", async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "pri");
    expect(shownNames()).toEqual(["Priya"]);
    expect(window.location.search).toBe("?q=pri");
    expect(screen.getByText("1 student", { selector: "[aria-live]" })).toBeTruthy();
  });

  it("the Filter menu picks a plan group and the two checks, with counts, and keeps them in the link", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const menu = screen.getByRole("menu", { name: "Filter" });
    const trouble = within(menu).getByRole("menuitemradio", { name: /^Retrying or lapsed/ });
    expect(trouble.textContent).toBe("Retrying or lapsed2");
    await user.click(trouble);
    await user.click(within(menu).getByRole("menuitemcheckbox", { name: /^Has this week's schedule/ }));
    expect(shownNames()).toEqual(["Priya"]);
    expect(window.location.search).toBe("?plan=trouble&week=ready");
    expect(screen.getByRole("button", { name: "Retrying or lapsed +1" })).toBeTruthy();
  });

  it("the Filter menu closes on Escape and returns focus to its button", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Filter" }));
  });

  it("column sort puts Retrying and Lapsed first under Plan, and keeps the sort in the link", async () => {
    const user = userEvent.setup();
    show();
    expect(shownNames()).toEqual(["Daniel", "Lucas", "Maya", "Priya"]);
    await user.click(screen.getByRole("button", { name: "Plan" }));
    expect(shownNames()).toEqual(["Priya", "Lucas", "Daniel", "Maya"]);
    expect(screen.getByRole("columnheader", { name: "Plan" }).getAttribute("aria-sort")).toBe("ascending");
    expect(window.location.search).toBe("?sort=plan");
  });

  it("the Sort menu for narrow screens picks Newest", async () => {
    const user = userEvent.setup();
    show({}, [row("Old", { joinedAt: new Date("2026-09-01T12:00:00Z") }), row("New", { joinedAt: new Date("2026-11-01T12:00:00Z") })]);
    await user.click(screen.getByRole("button", { name: "Sort: Name" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Newest" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(shownNames()).toEqual(["New", "Old"]);
    expect(window.location.search).toBe("?sort=newest");
  });

  it("opens with the choices from the page link", () => {
    show({ q: "a", plan: "trouble", sort: "plan" });
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "a");
    expect(shownNames()).toEqual(["Priya", "Lucas"]);
  });

  it("a navigation to another Students link replaces the choices", () => {
    const { rerender } = show({ q: "pri" });
    expect(shownNames()).toEqual(["Priya"]);
    next.link = "";
    rerender(<StudentsLedger rows={ROWS} upcomingTestMonthCount={4} />);
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
    expect(shownNames()).toEqual(["Daniel", "Lucas", "Maya", "Priya"]);
  });

  it("keeps newer typing when Next reports the links it wrote late", async () => {
    const user = userEvent.setup();
    const { rerender } = show();
    await user.type(screen.getByRole("searchbox"), "ma");
    expect(window.location.search).toBe("?q=ma");
    for (const late of ["q=m", "q=ma"]) {
      next.link = late;
      rerender(<StudentsLedger rows={ROWS} upcomingTestMonthCount={4} />);
      expect(screen.getByRole("searchbox")).toHaveProperty("value", "ma");
    }
    expect(shownNames()).toEqual(["Maya"]);
  });

  it("a navigation still replaces the choices after typing, deleting, and retyping faster than Next reports", async () => {
    const user = userEvent.setup();
    const { rerender } = show();
    const search = screen.getByRole("searchbox");
    await user.type(search, "ab{Backspace}{Backspace}");
    await user.type(search, "a");
    next.link = "q=a";
    rerender(<StudentsLedger rows={ROWS} upcomingTestMonthCount={4} />);
    next.link = "";
    rerender(<StudentsLedger rows={ROWS} upcomingTestMonthCount={4} />);
    expect(search).toHaveProperty("value", "");
    expect(shownNames()).toEqual(["Daniel", "Lucas", "Maya", "Priya"]);
  });

  it("opens with the choices in the link", () => {
    next.link = "q=pri";
    render(<StudentsLedger rows={ROWS} upcomingTestMonthCount={4} />);
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "pri");
    expect(shownNames()).toEqual(["Priya"]);
  });

  it("says when nothing matches, and Clear filters brings every student back but keeps the sort", async () => {
    const user = userEvent.setup();
    show({ q: "zzzz", sort: "plan" });
    expect(screen.getByText("No students match.")).toBeTruthy();
    await user.click(within(screen.getByRole("region", { name: "Student list" })).getByRole("button", { name: "Clear filters" }));
    expect(shownNames()).toEqual(["Priya", "Lucas", "Daniel", "Maya"]);
    expect(window.location.search).toBe("?sort=plan");
  });
});

describe("the few test months note", () => {
  const note = () => screen.queryByText(/upcoming test month/);

  it.each([3, 1, 0])("shows with %i upcoming months, linking to Test dates", (upcoming) => {
    render(<StudentsLedger rows={ROWS} upcomingTestMonthCount={upcoming} />);
    expect(note()).not.toBeNull();
    expect(screen.getByRole("link", { name: "Test dates" }).getAttribute("href")).toBe("/admin/test-dates");
  });

  it("says how many months are left", () => {
    render(<StudentsLedger rows={ROWS} upcomingTestMonthCount={3} />);
    expect(note()?.textContent).toMatch(/^Only 3 upcoming test months are left/);
  });

  it.each([4, 6])("hides with %i upcoming months", (upcoming) => {
    render(<StudentsLedger rows={ROWS} upcomingTestMonthCount={upcoming} />);
    expect(note()).toBeNull();
    expect(screen.queryByRole("link", { name: "Test dates" })).toBeNull();
  });
});
