// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, ButtonLink, IconButton } from "./Button";
import { Checkbox } from "./Checkbox";
import { DropZone } from "./DropZone";
import { Footer } from "./Footer";
import { NavTab } from "./NavTab";
import { PageHeader } from "./PageHeader";
import { ProgressBar } from "./ProgressBar";
import { ReminderStrip } from "./ReminderStrip";
import { SegmentedSwitch } from "./SegmentedSwitch";
import { TextInput } from "./TextInput";

afterEach(cleanup);

// user-event walks radio groups with CSS.escape, which jsdom lacks.
globalThis.CSS ??= Object.assign(Object.create(null), { escape: (value: string) => value });

const RING = "focus-visible:outline-accent";

const isChecked = (element: HTMLElement) => element instanceof HTMLInputElement && element.checked;
const valueOf = (element: HTMLElement) => (element instanceof HTMLInputElement ? element.value : null);
const description = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();

describe("Button", () => {
  it("takes keyboard focus with the Accent ring and runs on Enter", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Get started</Button>);
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button).toBe(document.activeElement);
    expect(button.className).toContain(RING);
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("drops to 40% and ignores presses when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Get started</Button>);
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button.className).toContain("disabled:opacity-muted");
    await userEvent.click(button);
    await userEvent.tab();
    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toBe(document.activeElement);
  });

  it("styles each variant and size from the board", () => {
    render(
      <>
        <Button variant="outline" size="md">Book a demo</Button>
        <ButtonLink href="/signup" variant="text">Get a demo</ButtonLink>
        <IconButton label="Scroll to top">↑</IconButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Book a demo" }).className).toMatch(/border-vellum-line.*h-10/);
    expect(screen.getByRole("link", { name: "Get a demo" }).className).toMatch(/hover:bg-vellum-line.*h-12/);
    expect(screen.getByRole("button", { name: "Scroll to top" }).className).toContain("size-8");
  });
});

describe("TextInput", () => {
  it("links its label and helper, and takes keyboard focus", async () => {
    render(<TextInput label="Thursday capacity" helper="Applies from next week's plan" />);
    await userEvent.tab();
    const input = screen.getByRole("textbox", { name: "Thursday capacity" });
    expect(input).toBe(document.activeElement);
    expect(input.className).toContain(RING);
    expect(description(input)).toBe("Applies from next week's plan");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("shows an error in place of the helper", () => {
    render(<TextInput label="Thursday capacity" helper="Applies from next week's plan" error="A day has 24 hours. Enter 24 h or less." defaultValue="25 h" />);
    const input = screen.getByRole("textbox", { name: "Thursday capacity" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.className).toContain("border-danger-ink");
    expect(description(input)).toBe("A day has 24 hours. Enter 24 h or less.");
    expect(screen.queryByText("Applies from next week's plan")).toBeNull();
  });

  it("cannot be focused or typed in when disabled", async () => {
    render(<TextInput label="Thursday capacity" disabled defaultValue="2 h" />);
    await userEvent.tab();
    const input = screen.getByRole("textbox", { name: "Thursday capacity" });
    expect(input).not.toBe(document.activeElement);
    await userEvent.type(input, "0");
    expect(valueOf(input)).toBe("2 h");
  });
});

describe("Checkbox", () => {
  it("checks from the label and from Space after Tab", async () => {
    render(<Checkbox label="Link assumption" />);
    const box = screen.getByRole("checkbox", { name: "Link assumption" });
    await userEvent.tab();
    expect(box).toBe(document.activeElement);
    expect(box.className).toContain(RING);
    expect(box.className).toContain("focus-visible:border-ink");
    await userEvent.keyboard(" ");
    expect(isChecked(box)).toBe(true);
    await userEvent.click(screen.getByText("Link assumption"));
    expect(isChecked(box)).toBe(false);
  });
});

describe("SegmentedSwitch", () => {
  const options = [
    { value: "standard", label: "Standard" },
    { value: "1.5x", label: "1.5× time" },
    { value: "2x", label: "2× time" },
  ] as const;

  it("is one Tab stop and the arrow keys change the choice", async () => {
    const onChange = vi.fn();
    render(<SegmentedSwitch name="time" label="Test time" options={options} defaultValue="standard" onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Test time" })).toBeTruthy();
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Standard" })).toBe(document.activeElement);
    await userEvent.keyboard("{ArrowRight}");
    expect(isChecked(screen.getByRole("radio", { name: "1.5× time" }))).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith("1.5x");
    await userEvent.tab();
    expect(document.activeElement).toBe(document.body);
  });

  it("draws the focus ring on the chosen option", () => {
    render(<SegmentedSwitch name="time" label="Test time" options={options} defaultValue="standard" />);
    const option = screen.getByRole("radio", { name: "Standard" }).closest("label");
    expect(option?.className).toContain("has-focus-visible:outline-accent");
    expect(option?.className).toContain("has-checked:bg-paper");
  });
});

describe("DropZone", () => {
  const file = new File(["png"], "lr.png", { type: "image/png" });

  it("is one button that opens the file picker from the keyboard", async () => {
    const onFile = vi.fn();
    const { container } = render(<DropZone label="Logical Reasoning screenshot" accept="image/png" onFile={onFile} />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    const pick = vi.spyOn(input, "click");
    await userEvent.tab();
    const zone = screen.getByRole("button", { name: /Logical Reasoning screenshot/ });
    expect(zone).toBe(document.activeElement);
    expect(zone.className).toContain(RING);
    expect(zone.className).toMatch(/border-ink\/muted.*bg-vellum.*hover:border-ink/);
    await userEvent.keyboard("{Enter}");
    expect(pick).toHaveBeenCalledOnce();
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("turns Accent while a file is over it and hands over the dropped file", () => {
    const onFile = vi.fn();
    render(<DropZone label="Logical Reasoning screenshot" onFile={onFile} />);
    const zone = screen.getByRole("button", { name: /Logical Reasoning screenshot/ });
    fireEvent.dragOver(zone, { dataTransfer: { files: [file] } });
    expect(zone.getAttribute("data-state")).toBe("drag-over");
    expect(zone.textContent).toContain("Drop to add it");
    expect(zone.className).toMatch(/border-accent bg-accent\/faint/);
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(zone.getAttribute("data-state")).toBe("idle");
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("names the error under the zone", () => {
    render(<DropZone label="Reading Comprehension screenshot" error="That file is 12.4 MB. Choose one that is 5 MB or less." onFile={vi.fn()} />);
    const zone = screen.getByRole("button", { name: /Reading Comprehension screenshot/ });
    expect(zone.getAttribute("data-state")).toBe("error");
    expect(zone.className).toMatch(/border-danger-ink bg-vellum/);
    expect(description(zone)).toBe("That file is 12.4 MB. Choose one that is 5 MB or less.");
  });
});

describe("ProgressBar", () => {
  it.each([
    { done: 1, dueSoFar: 1, pace: "On pace" },
    { done: 3, dueSoFar: 7, pace: "4 behind" },
    { done: 4, dueSoFar: 2, pace: "2 ahead" },
  ])("shows $pace for $done done of $dueSoFar due", ({ done, dueSoFar, pace }) => {
    render(<ProgressBar done={done} total={11} dueSoFar={dueSoFar} />);
    expect(screen.getByText(`${11 - done} remaining`)).toBeTruthy();
    expect(screen.getByText(`${done} of 11 done`)).toBeTruthy();
    expect(screen.getByText(pace)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(String(done));
  });

  it("keeps the pace status right and gives Today its own line near the end of the track", () => {
    render(<ProgressBar done={9} total={11} dueSoFar={11} />);
    expect(screen.getByText("2 behind").parentElement?.className).toContain("items-end");
    expect(screen.getByText("Today").className).toContain("relative self-start");
  });

  it("has no today tick or pace without a due count", () => {
    const { container } = render(<ProgressBar done={11} total={11} />);
    expect(screen.getByText("0 remaining")).toBeTruthy();
    expect(container.querySelector("[data-today-tick]")).toBeNull();
    expect(screen.queryByText("Today")).toBeNull();
  });
});

describe("app shell pieces", () => {
  it("marks the current nav tab", () => {
    render(
      <>
        <NavTab href="/dashboard" current>This week</NavTab>
        <NavTab href="/progress" current={false}>Progress</NavTab>
      </>,
    );
    const current = screen.getByRole("link", { name: "This week" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.className).toContain("font-medium");
    expect(screen.getByRole("link", { name: "Progress" }).hasAttribute("aria-current")).toBe(false);
  });

  it("renders the reminder strip with its link and no close button", () => {
    render(<ReminderStrip message="Next week starts Monday." href="/dashboard/upload" action="Plan next week" />);
    expect(screen.getByRole("link", { name: "Plan next week" }).getAttribute("href")).toBe("/dashboard/upload");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the page header band", () => {
    render(<PageHeader eyebrow="Week of September 28" title="Your plan for this week" lead="Your plan is set."
      notes={["Sufficient assumption comes first this week.", "Weaken sits out this week."]} />);
    expect(screen.getByRole("heading", { level: 1, name: "Your plan for this week" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent))
      .toEqual(["Sufficient assumption comes first this week.", "Weaken sits out this week."]);
  });

  it("renders the footer's legal links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe("/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/legal/privacy");
    expect(screen.getByRole("link", { name: "AI Disclosure" }).getAttribute("href")).toBe("/legal/ai-disclosure");
  });
});
