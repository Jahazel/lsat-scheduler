// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fact } from "@/lib/studentFacts";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

import { StudentDetail, type DetailStudent } from "./StudentDetail";
import StudentNotFound from "./not-found";

afterEach(cleanup);

const maya: DetailStudent = { id: "s1", initials: "MT", name: "Maya Thompson", email: "maya@example.test", plan: "paid", needsAnalytics: false };
const facts: Fact[] = [
  { label: "Score", value: "158 → 170" },
  { label: "Test", value: "Jan 2027 · 45 days" },
  { label: "Study time", value: "15 h 30 min per week" },
  { label: "Joined", value: "Sep 2" },
  { label: "Past weeks", value: "None yet", muted: true },
];

const panels = { week: <p>The live week</p>, weeks: <p>The past weeks</p>, progress: <p>The uploads</p> };

function show(link: string, student = maya) {
  window.history.replaceState(null, "", `/admin/students/s1${link}`);
  return render(<StudentDetail student={student} facts={facts} panels={panels} />);
}
const factsShown = () => {
  const values = screen.getAllByRole("definition").map((value) => value.textContent);
  return screen.getAllByRole("term").map((label, index) => `${label.textContent}: ${values[index]}`);
};
const selectedTab = () => screen.getByRole("tab", { selected: true }).textContent;

describe("Student detail", () => {
  it("shows the facts card: name, email, plan, read only, and each fact", () => {
    show("");
    const card = screen.getByRole("region", { name: "Student" });
    expect(within(card).getByRole("heading", { level: 1, name: "Maya Thompson" })).toBeTruthy();
    for (const text of ["MT", "maya@example.test", "Paid", "Read only"]) expect(within(card).getByText(text)).toBeTruthy();
    expect(within(card).queryByText("Needs analytics")).toBeNull();
    expect(factsShown()).toEqual(["Score: 158 → 170", "Test: Jan 2027 · 45 days", "Study time: 15 h 30 min per week", "Joined: Sep 2", "Past weeks: None yet"]);
  });

  it("opens the student in the Schedule lab", () => {
    show("");
    const card = screen.getByRole("region", { name: "Student" });
    expect(within(card).getByRole("link", { name: "Open in lab" }).getAttribute("href")).toBe("/admin/lab?student=s1");
  });

  it("marks a student who needs analytics and one with no name", () => {
    show("", { ...maya, name: null, needsAnalytics: true, plan: "no_plan" });
    expect(screen.getByRole("heading", { level: 1, name: "No name" })).toBeTruthy();
    expect(screen.getByText("Needs analytics")).toBeTruthy();
    expect(screen.getByText("No plan")).toBeTruthy();
  });

  it("returns ← All students to the list's search, filter, and sort", () => {
    show("?q=may&plan=paid&sort=newest&tab=progress");
    expect(screen.getByRole("link", { name: "← All students" }).getAttribute("href")).toBe("/admin?q=may&plan=paid&sort=newest");
  });

  it("opens on This week, with the live week in its panel", () => {
    show("?sort=newest");
    expect(selectedTab()).toBe("This week");
    expect(screen.getByRole("tabpanel").textContent).toBe("The live week");
  });

  it("opens the tab its link names, with that tab's panel", () => {
    show("?tab=weeks");
    expect(selectedTab()).toBe("Past weeks");
    expect(screen.getByRole("tabpanel").textContent).toBe("The past weeks");
    expect(screen.queryByText("The live week")).toBeNull();
    cleanup();
    show("?tab=progress");
    expect(screen.getByRole("tabpanel").textContent).toBe("The uploads");
  });

  it("keeps the picked tab in the page link, beside the list's choices", async () => {
    const { rerender } = show("?sort=newest");
    await userEvent.click(screen.getByRole("tab", { name: "Settings & tests" }));
    expect(window.location.search).toBe("?sort=newest&tab=settings");
    rerender(<StudentDetail student={maya} facts={facts} panels={panels} />);
    expect(screen.getByRole("tabpanel").textContent).toBe("Settings & tests is not ready yet.");

    await userEvent.keyboard("{Home}");
    expect(window.location.search).toBe("?sort=newest");
  });
});

describe("Student not found", () => {
  it("says no student has the link and goes back to the list", () => {
    window.history.replaceState(null, "", "/admin/students/missing?plan=trouble");
    render(<StudentNotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Student not found" })).toBeTruthy();
    expect(screen.getByText("No student has this link.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "← All students" }).getAttribute("href")).toBe("/admin?plan=trouble");
  });
});
