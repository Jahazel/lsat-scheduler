// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: router.push, replace: vi.fn() }), usePathname: () => "/settings" }));
import { FailureToastProvider } from "@/components/FailureNotice";
import { SignOutForm } from "@/components/SignOutForm";
import SiteMotion from "@/components/SiteMotion";
import type { SignOutAnswer } from "@/lib/requestPolicy";
import { everyDay, upcomingTestMonths, type StudySettingsInput } from "@/lib/studentProfile";
import type { FailureCode, FormState } from "@/lib/unexpectedFailure";
import type { StudySettingsAnswer } from "./actions";
import { StudySettingsForm } from "./StudySettingsForm";

const saved: StudySettingsInput = {
  goalScore: 165,
  goalTestDate: "2027-06-01",
  accommodationMultiplier: 1,
  dailyCapacityMinutes: { ...everyDay(90), SATURDAY: 210 },
  preferredPracticeTestDay: "SATURDAY",
  officialAttempts: [],
};
const twoAttempts = [{ score: 152, month: "2025-06" }, { score: 149, month: "2026-01" }];

const SAVE_NOTE = "Changes apply to your next weekly schedule.";
const SAVED_NOTE = "Saved. Changes apply to your next weekly schedule.";

function renderForm({ onSave = vi.fn(async (): Promise<StudySettingsAnswer> => null), values = saved, currentScore = 150 } = {}) {
  render(
    <StudySettingsForm currentScore={currentScore} saved={values} today="2026-11-02" goalTestDateOptions={upcomingTestMonths("2026-11-02")} onSave={onSave} />,
    { wrapper: FailureToastProvider },
  );
  return { onSave };
}

const attemptScore = (n: number) => screen.getByRole("textbox", { name: `Attempt ${n} score` }) as HTMLInputElement;
const attemptMonth = (n: number) => screen.getByRole("combobox", { name: `Attempt ${n} month and year` }) as HTMLSelectElement;
const addAttempt = () => screen.queryByRole("button", { name: "Add attempt" });
const goalScore = () => screen.getByRole("textbox", { name: "Goal score" }) as HTMLInputElement;
const saveButton = () => screen.queryByRole("button", { name: /Save changes|Saving…/ }) as HTMLButtonElement | null;
const status = () => screen.queryByRole("status");

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
    await userEvent.click(screen.getByRole("radio", { name: "Practice test on Tuesday" }));
    await userEvent.click(saveButton()!);

    expect(screen.getByRole("button", { name: "Saving…" })).toBe(saveButton());
    expect(saveButton()?.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(saveButton());
    expect(status()?.textContent).toBe("Saving…");
    expect(goalScore().value).toBe("172");
    expect(onSave).toHaveBeenCalledWith({
      goalScore: 172,
      goalTestDate: "2027-04-01",
      accommodationMultiplier: 1.5,
      dailyCapacityMinutes: { ...saved.dailyCapacityMinutes, TUESDAY: 270 },
      preferredPracticeTestDay: "TUESDAY",
      officialAttempts: [],
    });

    vi.useFakeTimers();
    await act(async () => finish(null));
    expect(status()?.textContent).toBe(SAVED_NOTE);
    expect(saveButton()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Study settings" }));
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

  it("shows the goal message, not the failure toast, when the current score has reached the goal since the page opened", async () => {
    const onSave = vi.fn(async (): Promise<StudySettingsAnswer> => ({ refused: "goalScore", currentScore: 168 }));
    renderForm({ onSave });
    await typeGoal("166");
    await userEvent.click(saveButton()!);

    expect(screen.getByText("Your goal must be higher than your current score, 168.")).toBeTruthy();
    expect(screen.getByText("168")).toBeTruthy();
    expect(goalScore().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(goalScore());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveButton()?.textContent).toBe("Save changes");

    await typeGoal("170");
    expect(screen.queryByText(/must be higher/)).toBeNull();
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ goalScore: 170 }));
  });

  it("leaves focus in the goal score when Enter there saves the form", async () => {
    renderForm();
    await typeGoal("170{Enter}");
    expect(status()?.textContent).toBe(SAVED_NOTE);
    expect(document.activeElement).toBe(goalScore());
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

  it("says the test month has passed, leaves the month empty, and shows no notice for an offered month", () => {
    renderForm({ values: { ...saved, goalTestDate: "2026-10-01" } });
    const notice = screen.getByText("Your test month has passed. Choose a new one.");
    const month = screen.getByRole("combobox", { name: "Goal test month" }) as HTMLSelectElement;
    expect(month.value).toBe("");
    expect(month.getAttribute("aria-describedby")).toBe(notice.id);
    expect(saveButton()).toBeNull();
    cleanup();

    renderForm();
    expect(screen.queryByText("Your test month has passed. Choose a new one.")).toBeNull();
  });

  it("saves once a new month is chosen after the test month passed, then drops the notice", async () => {
    const { onSave } = renderForm({ values: { ...saved, goalTestDate: "2026-10-01" } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Goal test month" }), "2027-04-01");
    await userEvent.click(saveButton()!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ goalTestDate: "2027-04-01" }));
    expect(status()?.textContent).toBe(SAVED_NOTE);
    expect(screen.queryByText("Your test month has passed. Choose a new one.")).toBeNull();
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

  it("refuses a practice-test day shorter than the practice test, shows why under that day, and saves once it has the time", async () => {
    const { onSave } = renderForm();
    const week = within(screen.getByRole("region", { name: "Week" }));
    expect(week.getByText("A full practice test takes 2 h 30 with standard time.")).toBeTruthy();

    await userEvent.click(screen.getByRole("radio", { name: "Practice test on Sunday" }));
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    expect(week.getByText("Sunday needs at least 2 h 30 for a full practice test. Add time or pick another day.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Sunday hours" }));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sunday hours" }), "2");
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ preferredPracticeTestDay: "SUNDAY", dailyCapacityMinutes: { ...saved.dailyCapacityMinutes, SUNDAY: 150 } }));
  });

  it("refuses a longer Test time that no longer fits the practice-test day", async () => {
    const { onSave } = renderForm();
    await userEvent.click(screen.getByRole("radio", { name: "2× time" }));
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Saturday needs at least 3 h 45 for a full practice test. Add time or pick another day.")).toBeTruthy();
  });

  it("applies the All days value to every day", async () => {
    const { onSave } = renderForm();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "All days hours" }), "2");
    expect(saveButton()).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dailyCapacityMinutes: everyDay(150) }));
  });

  it("shows the Weekly total the way the week board does", () => {
    renderForm();
    expect(screen.getByText("Weekly total").nextElementSibling?.textContent).toBe("12 h 30");
  });
});

describe("Study settings week preview", () => {
  const preview = () => within(screen.getByRole("complementary", { name: "Preview of your next weekly schedule" }));
  const previewDays = () => preview().getAllByRole("listitem").map((row) => row.textContent);

  it("shows each day's time, the practice-test day, and the goal beside the capacity table", () => {
    renderForm();
    const week = within(screen.getByRole("region", { name: "Week" }));
    expect(week.getByRole("complementary", { name: "Preview of your next weekly schedule" })).toBeTruthy();
    expect(preview().getByText("150 → 165")).toBeTruthy();
    expect(preview().getByText("by June 2027 · 12 h 30 a week")).toBeTruthy();
    expect(previewDays()).toEqual(["Mon1 h 30", "Tue1 h 30", "Wed1 h 30", "Thu1 h 30", "Fri1 h 30", "SatPT3 h 30", "Sun1 h 30"]);
  });

  it("follows edits before saving, marks each changed day, and clears the marks once saved", async () => {
    renderForm();
    await typeGoal("168");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Friday minutes" }), "0");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Friday hours" }), "2");
    await userEvent.click(screen.getByRole("radio", { name: "Practice test on Sunday" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sunday hours" }), "2");

    expect(preview().getByText("150 → 168")).toBeTruthy();
    expect(preview().getByText("by June 2027 · 14 h a week")).toBeTruthy();
    expect(previewDays()).toEqual([
      "Mon1 h 30",
      "Tue1 h 30",
      "Wed1 h 30",
      "Thu1 h 30",
      "Fri2 h (changed)",
      "Sat3 h 30 (changed)",
      "SunPT2 h 30 (changed)",
    ]);

    await userEvent.click(saveButton()!);
    expect(previewDays().some((day) => day?.includes("(changed)"))).toBe(false);
  });

  it("drops a day's mark when its edit is undone", async () => {
    renderForm();
    const tuesday = screen.getByRole("combobox", { name: "Tuesday hours" });
    await userEvent.selectOptions(tuesday, "3");
    expect(previewDays()[1]).toBe("Tue3 h 30 (changed)");
    await userEvent.selectOptions(tuesday, "1");
    expect(previewDays()[1]).toBe("Tue1 h 30");
  });

  it("renders data case B: every day different, 8 h days", () => {
    renderForm({
      values: {
        ...saved,
        goalScore: 170,
        goalTestDate: "2027-01-01",
        dailyCapacityMinutes: { MONDAY: 480, TUESDAY: 150, WEDNESDAY: 480, THURSDAY: 60, FRIDAY: 270, SATURDAY: 480, SUNDAY: 360 },
      },
    });
    expect(preview().getByText("150 → 170")).toBeTruthy();
    expect(preview().getByText("by January 2027 · 38 h a week")).toBeTruthy();
    expect(previewDays()).toEqual(["Mon8 h", "Tue2 h 30", "Wed8 h", "Thu1 h", "Fri4 h 30", "SatPT8 h", "Sun6 h"]);
  });

  it("renders data case A: all days equal with a Sunday practice test", () => {
    renderForm({
      currentScore: 179,
      values: { ...saved, goalScore: 180, dailyCapacityMinutes: everyDay(30), preferredPracticeTestDay: "SUNDAY" },
    });
    expect(preview().getByText("179 → 180")).toBeTruthy();
    expect(preview().getByText("by June 2027 · 3 h 30 a week")).toBeTruthy();
    expect(previewDays()).toEqual(["Mon30 min", "Tue30 min", "Wed30 min", "Thu30 min", "Fri30 min", "Sat30 min", "SunPT30 min"]);
  });

  it("asks for a test month when the saved one has passed", () => {
    renderForm({ values: { ...saved, goalTestDate: "2026-10-01" } });
    expect(preview().getByText("choose a test month · 12 h 30 a week")).toBeTruthy();
  });
});

describe("Official LSAT attempts", () => {
  it("shows the empty list, adds a row with focus on its score, and saves the new attempt", async () => {
    const { onSave } = renderForm();
    expect(screen.getByText("No official attempts yet")).toBeTruthy();

    await userEvent.click(addAttempt()!);
    expect(screen.queryByText("No official attempts yet")).toBeNull();
    expect(document.activeElement).toBe(attemptScore(1));
    expect(saveButton()).not.toBeNull();

    await userEvent.type(attemptScore(1), "158");
    await userEvent.selectOptions(attemptMonth(1), "2026-08");
    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ officialAttempts: [{ score: 158, month: "2026-08" }] }));
  });

  it("shows saved attempts, edits one, and removes another", async () => {
    const { onSave } = renderForm({ values: { ...saved, officialAttempts: twoAttempts } });
    expect(attemptScore(1).value).toBe("152");
    expect(attemptMonth(2).value).toBe("2026-01");
    expect(saveButton()).toBeNull();

    await userEvent.clear(attemptScore(2));
    await userEvent.type(attemptScore(2), "151");
    await userEvent.click(screen.getByRole("button", { name: "Remove attempt 1" }));
    await act(async () => {});
    expect(screen.queryByRole("textbox", { name: "Attempt 2 score" })).toBeNull();
    expect(attemptScore(1).value).toBe("151");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove attempt 1" }));

    await userEvent.click(saveButton()!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ officialAttempts: [{ score: 151, month: "2026-01" }] }));
  });

  it("keeps a removed attempt on screen until its exit ends, then moves focus to the next row", async () => {
    let endExit!: () => void;
    const exit = new Promise<void>((resolve) => (endExit = resolve));
    Element.prototype.getAnimations = function (this: Element) {
      return this.hasAttribute("data-leaving") ? [{ finished: exit } as unknown as Animation] : [];
    };
    try {
      renderForm({ values: { ...saved, officialAttempts: twoAttempts } });
      await userEvent.click(screen.getByRole("button", { name: "Remove attempt 1" }));
      expect(document.querySelector("[data-leaving]")).not.toBeNull();

      await act(async () => endExit());
      expect(document.querySelector("[data-leaving]")).toBeNull();
      expect(attemptScore(1).value).toBe("149");
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove attempt 1" }));
    } finally {
      delete (Element.prototype as Partial<Element>).getAnimations;
    }
  });

  it("hides the save bar when a removed attempt is added back the same", async () => {
    renderForm({ values: { ...saved, officialAttempts: [twoAttempts[0]] } });
    await userEvent.click(screen.getByRole("button", { name: "Remove attempt 1" }));
    await act(async () => {});
    expect(screen.getByText("No official attempts yet")).toBeTruthy();
    expect(document.activeElement).toBe(addAttempt());
    expect(saveButton()).not.toBeNull();

    await userEvent.click(addAttempt()!);
    await userEvent.type(attemptScore(1), "152");
    await userEvent.selectOptions(attemptMonth(1), "2025-06");
    expect(saveButton()).toBeNull();
  });

  it("asks for a month again when a saved attempt's month is no longer offered", async () => {
    const { onSave } = renderForm({ values: { ...saved, officialAttempts: [{ score: 150, month: "2021-10" }] } });
    expect(attemptMonth(1).value).toBe("");
    await typeGoal("170");
    await userEvent.click(saveButton()!);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Pick the month of this attempt.")).toBeTruthy();
  });

  it("replaces Add attempt with the limit note at ten attempts", async () => {
    const nine = Array.from({ length: 9 }, () => twoAttempts[0]);
    renderForm({ values: { ...saved, officialAttempts: nine } });
    expect(screen.queryByText("You can record up to 10 attempts.")).toBeNull();

    await userEvent.click(addAttempt()!);
    expect(addAttempt()).toBeNull();
    expect(screen.getByText("You can record up to 10 attempts.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Remove attempt/ })).toHaveLength(10);

    await userEvent.click(screen.getByRole("button", { name: "Remove attempt 10" }));
    await act(async () => {});
    expect(addAttempt()).not.toBeNull();
    expect(screen.queryByText("You can record up to 10 attempts.")).toBeNull();
  });

  it("refuses a row with no score or no month, shows its message, and moves focus to the first", async () => {
    const { onSave } = renderForm({ values: { ...saved, officialAttempts: twoAttempts } });
    await userEvent.click(addAttempt()!);
    await userEvent.click(addAttempt()!);
    await userEvent.type(attemptScore(4), "150");
    await userEvent.click(saveButton()!);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the score from this attempt.")).toBeTruthy();
    expect(screen.getByText("Pick the month of this attempt.")).toBeTruthy();
    expect(attemptScore(3).getAttribute("aria-invalid")).toBe("true");
    expect(attemptMonth(4).getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(attemptScore(3));

    await userEvent.type(attemptScore(3), "190");
    expect(screen.getByText("LSAT scores go from 120 to 180. Check this attempt's score.")).toBeTruthy();
  });
});

describe("Study settings leave guard", () => {
  let navigated: string[];
  let logOut: ReturnType<typeof vi.fn<() => Promise<SignOutAnswer>>>;

  beforeEach(() => {
    navigated = [];
    logOut = vi.fn(async (): Promise<SignOutAnswer> => ({ goTo: "/?signedOut=1" }));
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
    HTMLDialogElement.prototype.getAnimations = () => [];
  });

  function goTo(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!event.defaultPrevented) navigated.push(event.currentTarget.getAttribute("href")!);
    event.preventDefault();
  }

  function AccountMenu() {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>Account menu</button>
        <div role="menu" hidden={!open}>
          <a role="menuitem" href="/account" onClick={(event) => { setOpen(false); goTo(event); }}>Account</a>
          <SignOutForm action={logOut}>
            <button role="menuitem" type="submit">Log out</button>
          </SignOutForm>
        </div>
      </div>
    );
  }

  function renderWithNav(onSave: (input: StudySettingsInput) => Promise<StudySettingsAnswer> = async () => null) {
    window.history.pushState({}, "", "/settings");
    router.push.mockImplementation((href: string) => navigated.push(href));
    render(
      <>
        <header>
          <a href="/dashboard" onClick={goTo}>DrillMap</a>
          <nav aria-label="Primary">
            <a href="/dashboard" onClick={goTo}>This week</a>
            <a href="/settings" aria-current="page" onClick={goTo}>Study settings</a>
          </nav>
          <AccountMenu />
        </header>
        <StudySettingsForm currentScore={150} saved={saved} today="2026-11-02" goalTestDateOptions={upcomingTestMonths("2026-11-02")} onSave={onSave} />
        <SiteMotion signedIn />
      </>,
      { wrapper: FailureToastProvider },
    );
  }

  const thisWeek = () => screen.getByRole("link", { name: "This week" });
  const leaveDialog = () => screen.queryByRole("dialog", { name: "Leave without saving?" });
  const openDialog = () => (leaveDialog()?.hasAttribute("open") ? leaveDialog() : null);
  const leaveRequested = (event: BeforeUnloadEvent) => {
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it("lets a clean page follow a nav tab and leave the browser tab without asking", async () => {
    renderWithNav();
    await userEvent.click(thisWeek());
    expect(navigated).toEqual(["/dashboard"]);
    expect(openDialog()).toBeNull();
    expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(false);
  });

  it("asks before following another nav tab with unsaved edits and puts focus on Stay", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(thisWeek());

    expect(navigated).toEqual([]);
    const dialog = openDialog()!;
    expect(within(dialog).getByText("Your changes to Study settings will be lost.")).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Stay" }));
  });

  it("does not ask when the student taps the Study settings tab they are on", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(screen.getByRole("link", { name: "Study settings" }));
    expect(openDialog()).toBeNull();
  });

  it("keeps the edits and returns focus to the tab on Stay", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(thisWeek());
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Stay" }));

    expect(openDialog()).toBeNull();
    expect(navigated).toEqual([]);
    expect(document.activeElement).toBe(thisWeek());
    expect(goalScore().value).toBe("170");
    expect(saveButton()).not.toBeNull();
  });

  it("treats Escape as Stay", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(thisWeek());
    await userEvent.keyboard("{Escape}");

    expect(openDialog()).toBeNull();
    expect(navigated).toEqual([]);
    expect(document.activeElement).toBe(thisWeek());
    expect(goalScore().value).toBe("170");
  });

  it("goes to the chosen tab on Leave", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(thisWeek());
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));

    expect(openDialog()).toBeNull();
    expect(navigated).toEqual(["/dashboard"]);
  });

  it.each([
    ["the DrillMap logo", () => screen.getByRole("link", { name: "DrillMap" }), "/dashboard"],
    ["the Account link", () => screen.getByRole("menuitem", { name: "Account" }), "/account"],
  ])("asks before following %s with unsaved edits", async (_name, link, href) => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(link());

    expect(navigated).toEqual([]);
    expect(openDialog()).not.toBeNull();
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));
    expect(navigated).toEqual([href]);
  });

  it("lets the Account link close its menu behind the dialog", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(screen.getByRole("menuitem", { name: "Account" }));

    expect(openDialog()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Account menu" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("returns focus to the account menu button on Stay from the Account link", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(screen.getByRole("menuitem", { name: "Account" }));
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Stay" }));

    expect(navigated).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Account menu" }));
  });

  it("asks again before the browser tab closes when a click on this page drops the page change Leave started", async () => {
    renderWithNav();
    await typeGoal("170");
    await userEvent.click(thisWeek());
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));
    expect(navigated).toEqual(["/dashboard"]);
    expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(false);

    await userEvent.click(screen.getByRole("link", { name: "Study settings" }));
    expect(goalScore().value).toBe("170");
    expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(true);
  });

  function slowSave() {
    let finish: (outcome: () => StudySettingsAnswer) => void = () => {};
    const onSave = vi.fn(() => new Promise<StudySettingsAnswer>((resolve, reject) => {
      finish = (outcome) => {
        try {
          resolve(outcome());
        } catch (error) {
          reject(error);
        }
      };
    }));
    return { onSave, finish: (outcome: () => StudySettingsAnswer) => act(async () => finish(outcome)) };
  }

  async function leaveDuringSave(onSave: () => Promise<StudySettingsAnswer>) {
    renderWithNav(onSave);
    await typeGoal("170");
    await userEvent.click(saveButton()!);
    await userEvent.click(thisWeek());
    await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));
  }

  it("waits for a running save before leaving, then follows the link once it is saved", async () => {
    const { onSave, finish } = slowSave();
    await leaveDuringSave(onSave);

    expect(openDialog()).toBeNull();
    expect(navigated).toEqual([]);
    await finish(() => null);
    expect(navigated).toEqual(["/dashboard"]);
  });

  it("stays with the edits and the failure toast when the save running at Leave fails", async () => {
    const { onSave, finish } = slowSave();
    await leaveDuringSave(onSave);
    await finish(() => ({ unexpectedFailure: "3f9a2c1b" as FailureCode }));

    expect(navigated).toEqual([]);
    expect(goalScore().value).toBe("170");
    expect(screen.getByText(/3f9a2c1b/)).toBeTruthy();
  });

  it("stays with the edits and the connection note when the save running at Leave cannot reach the server", async () => {
    const { onSave, finish } = slowSave();
    await leaveDuringSave(onSave);
    await finish(() => {
      throw new TypeError("Failed to fetch");
    });

    expect(navigated).toEqual([]);
    expect(goalScore().value).toBe("170");
    expect(status()?.textContent).toBe("We couldn't save your changes. Check your connection and press Save changes again.");
  });

  describe("Log out", () => {
    const logOutItem = () => screen.getByRole("menuitem", { name: "Log out" });
    let assign: ReturnType<typeof vi.fn>;

    function renderSignedIn(onSave?: (input: StudySettingsInput) => Promise<StudySettingsAnswer>) {
      renderWithNav(onSave);
      assign = vi.fn();
      vi.stubGlobal("location", { ...window.location, assign });
    }

    afterEach(() => vi.unstubAllGlobals());

    it("signs out at once with no dialog when nothing is unsaved", async () => {
      renderSignedIn();
      await userEvent.click(logOutItem());

      expect(openDialog()).toBeNull();
      await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
      expect(logOut).toHaveBeenCalledTimes(1);
    });

    it("asks before signing out with unsaved edits, and Stay keeps the student and the edits on the page", async () => {
      renderSignedIn();
      await typeGoal("170");
      await userEvent.click(logOutItem());

      const dialog = openDialog()!;
      expect(within(dialog).getByText("Your changes to Study settings will be lost.")).toBeTruthy();
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Stay" }));

      await userEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
      expect(openDialog()).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Account menu" }));
      expect(goalScore().value).toBe("170");
      expect(logOut).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });

    it("signs out on Leave without the browser asking again as the signed-out page loads", async () => {
      renderSignedIn();
      const askedAtUnload: boolean[] = [];
      assign.mockImplementation(() => askedAtUnload.push(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)));
      await typeGoal("170");
      await userEvent.click(logOutItem());
      await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));

      await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
      expect(logOut).toHaveBeenCalledTimes(1);
      expect(askedAtUnload).toEqual([false]);
    });



    it("asks again before the browser tab closes when the sign-out after Leave fails", async () => {
      logOut.mockResolvedValue({ unexpectedFailure: "5c1d7e20" as FailureCode });
      renderSignedIn();
      await typeGoal("170");
      await userEvent.click(logOutItem());
      await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));

      expect((await screen.findByRole("alert")).textContent).toContain("5c1d7e20");
      expect(assign).not.toHaveBeenCalled();
      expect(goalScore().value).toBe("170");
      expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(true);
    });

    it("waits for a running save before signing out on Leave", async () => {
      const { onSave, finish } = slowSave();
      renderSignedIn(onSave);
      await typeGoal("170");
      await userEvent.click(saveButton()!);
      await userEvent.click(logOutItem());
      await userEvent.click(within(openDialog()!).getByRole("button", { name: "Leave" }));

      expect(logOut).not.toHaveBeenCalled();
      await finish(() => null);
      await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/?signedOut=1"));
    });
  });

  it("asks the browser to confirm closing or reloading only while edits are unsaved", async () => {
    renderWithNav();
    await typeGoal("170");
    expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(true);

    await typeGoal("165");
    expect(leaveRequested(new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent)).toBe(false);
  });
});
