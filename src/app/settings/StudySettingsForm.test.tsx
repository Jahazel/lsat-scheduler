// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FailureToastProvider } from "@/components/FailureNotice";
import { everyDay, upcomingTestMonths, type StudySettingsInput } from "@/lib/studentProfile";
import type { FailureCode, FormState } from "@/lib/unexpectedFailure";
import { StudySettingsForm } from "./StudySettingsForm";

const saved: StudySettingsInput = {
  goalScore: 165,
  goalTestDate: "2027-06-01",
  accommodationMultiplier: 1,
  dailyCapacityMinutes: { ...everyDay(90), SATURDAY: 210 },
  preferredPracticeTestDay: "SATURDAY",
};

const SAVE_NOTE = "Changes apply to your next weekly schedule.";
const SAVED_NOTE = "Saved. Changes apply to your next weekly schedule.";

function renderForm({ onSave = vi.fn(async (): Promise<FormState> => null), values = saved } = {}) {
  render(
    <StudySettingsForm currentScore={150} saved={values} goalTestDateOptions={upcomingTestMonths("2026-11-02")} onSave={onSave} />,
    { wrapper: FailureToastProvider },
  );
  return { onSave };
}

const goalScore = () => screen.getByRole("textbox", { name: "Goal score" }) as HTMLInputElement;
const saveButton = () => screen.queryByRole("button", { name: /Save changes|Saving…/ }) as HTMLButtonElement | null;
function status() {
  const region = screen.queryByRole("status");
  if (!region) return null;
  return { textContent: [...region.children].filter((child) => !child.hasAttribute("aria-hidden")).map((child) => child.textContent).join("") };
}

async function typeGoal(text: string) {
  await userEvent.clear(goalScore());
  if (text) await userEvent.type(goalScore(), text);
}

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Study settings form", () => {
  it("shows the current score as plain text that only the weekly upload changes", () => {
    renderForm();
    expect(screen.getByText("150")).toBeTruthy();
    expect(screen.getByText("Updates with each weekly upload")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /Current/ })).toBeNull();
  });

  it("shows the save bar after an edit and hides it again when every edit is undone", async () => {
    renderForm();
    expect(saveButton()).toBeNull();

    await typeGoal("170");
    expect(saveButton()?.disabled).toBe(false);
    expect(status()?.textContent).toBe(SAVE_NOTE);

    await typeGoal("165");
    expect(saveButton()).toBeNull();

    await userEvent.click(screen.getByRole("radio", { name: "2× time" }));
    expect(saveButton()).not.toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "Standard" }));
    expect(saveButton()).toBeNull();
  });

  it("saves every field but the current score, reads Saving… while it runs, then Saved for 6 s and stays on the page", async () => {
    let finish: (answer: FormState) => void = () => {};
    const onSave = vi.fn(() => new Promise<FormState>((resolve) => (finish = resolve)));
    renderForm({ onSave });

    await typeGoal("172");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Goal test month" }), "2027-04-01");
    await userEvent.click(screen.getByRole("radio", { name: "1.5× time" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tuesday hours" }), "4");
    await userEvent.click(screen.getByRole("radio", { name: "Practice test on Sunday" }));
    await userEvent.click(saveButton()!);

    expect(saveButton()?.textContent).toBe("Saving…");
    expect(saveButton()?.disabled).toBe(true);
    expect(goalScore().value).toBe("172");
    expect(onSave).toHaveBeenCalledWith({
      goalScore: 172,
      goalTestDate: "2027-04-01",
      accommodationMultiplier: 1.5,
      dailyCapacityMinutes: { ...saved.dailyCapacityMinutes, TUESDAY: 270 },
      preferredPracticeTestDay: "SUNDAY",
    });

    vi.useFakeTimers();
    await act(async () => finish(null));
    expect(status()?.textContent).toBe(SAVED_NOTE);
    expect(saveButton()).toBeNull();
    expect(goalScore().value).toBe("172");

    act(() => vi.advanceTimersByTime(5900));
    expect(status()?.textContent).toBe(SAVED_NOTE);
    act(() => vi.advanceTimersByTime(200));
    expect(status()).toBeNull();
  });

  it("brings back Save changes when the student edits during the Saved message", async () => {
    renderForm();
    await typeGoal("170");
    await userEvent.click(saveButton()!);
    expect(status()?.textContent).toBe(SAVED_NOTE);

    await typeGoal("171");
    expect(status()?.textContent).toBe(SAVE_NOTE);
    expect(saveButton()?.disabled).toBe(false);

    await typeGoal("170");
    expect(saveButton()).toBeNull();
  });

  it("keeps every edit and shows the failure toast when the save fails", async () => {
    renderForm({ onSave: vi.fn(async () => ({ unexpectedFailure: "3f9a2c1b" as FailureCode })) });
    await typeGoal("178");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Friday hours" }), "2");
    await userEvent.click(saveButton()!);

    const toast = await screen.findByRole("alert");
    expect(toast.textContent).toContain("Something went wrong. Try again.");
    expect(toast.textContent).toContain("3f9a2c1b");
    expect(goalScore().value).toBe("178");
    expect((screen.getByRole("combobox", { name: "Friday hours" }) as HTMLSelectElement).value).toBe("2");
    expect(saveButton()?.textContent).toBe("Save changes");
    expect(saveButton()?.disabled).toBe(false);
  });

  it("keeps every edit when the save cannot reach the server", async () => {
    renderForm({ onSave: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) });
    await typeGoal("178");
    await userEvent.click(saveButton()!);

    expect(status()?.textContent).toBe("We couldn't save your changes. Check your connection and press Save changes again.");
    expect(goalScore().value).toBe("178");
    expect(saveButton()?.disabled).toBe(false);
  });

  it("refuses a goal not above the current score, shows the message, and moves focus there", async () => {
    const { onSave } = renderForm();
    await typeGoal("140");
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Your goal must be higher than your current score, 150.")).toBeTruthy();
    expect(goalScore().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(goalScore());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });

    await typeGoal("180");
    expect(screen.queryByText(/must be higher/)).toBeNull();
  });

  it("refuses a goal score outside the LSAT range", async () => {
    const { onSave } = renderForm();
    await typeGoal("");
    await userEvent.click(saveButton()!);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("LSAT scores go from 120 to 180. Check your goal score.")).toBeTruthy();
  });

  it("shows each day's message for a day under 30 min or over 8 h, and moves focus to the first invalid field", async () => {
    const { onSave } = renderForm({ values: { ...saved, dailyCapacityMinutes: { ...saved.dailyCapacityMinutes, WEDNESDAY: 15, THURSDAY: 495 } } });
    await userEvent.click(screen.getByRole("radio", { name: "2× time" }));
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Enter at least 30 min.")).toBeTruthy();
    expect(screen.getByText("Enter 8 h or less.")).toBeTruthy();
    const wednesday = screen.getByRole("combobox", { name: "Wednesday hours" });
    expect(wednesday.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(wednesday);
  });

  it("asks for a test month when the saved one is no longer offered", async () => {
    const { onSave } = renderForm({ values: { ...saved, goalTestDate: "2026-10-01" } });
    await typeGoal("170");
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    const month = screen.getByRole("combobox", { name: "Goal test month" });
    expect(screen.getByText("Choose an upcoming LSAT test month.")).toBeTruthy();
    expect(document.activeElement).toBe(month);
  });

  it("hints at a practice-test day shorter than the practice test and still saves it", async () => {
    const { onSave } = renderForm();
    const week = within(screen.getByRole("region", { name: "Week" }));
    expect(week.getByText("A full practice test takes 2 h 30 with standard time.")).toBeTruthy();

    await userEvent.click(screen.getByRole("radio", { name: "Practice test on Sunday" }));
    expect(week.getByText("A full practice test takes 2 h 30 with standard time. Pick a day with that much time.")).toBeTruthy();
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ preferredPracticeTestDay: "SUNDAY" }));
  });

  it("applies the All days value to every day", async () => {
    const { onSave } = renderForm();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "All days hours" }), "2");
    expect(saveButton()).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dailyCapacityMinutes: everyDay(150) }));
  });
});
