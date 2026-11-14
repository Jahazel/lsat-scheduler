// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { Button, ButtonLink, IconButton } from "./Button";
import { Checkbox } from "./Checkbox";
import { DropZone } from "./DropZone";
import { Footer } from "./Footer";
import { NavTab } from "./NavTab";
import { PageHeader } from "./PageHeader";
import { ProgressBar } from "./ProgressBar";
import { SegmentedSwitch } from "./SegmentedSwitch";
import { TextInput } from "./TextInput";

afterEach(cleanup);

// user-event walks radio groups with CSS.escape, which jsdom lacks.
globalThis.CSS ??= Object.assign(Object.create(null), { escape: (value: string) => value });

const isChecked = (element: HTMLElement) => element instanceof HTMLInputElement && element.checked;
const valueOf = (element: HTMLElement) => (element instanceof HTMLInputElement ? element.value : null);
const description = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();

describe("Button", () => {
  it("takes keyboard focus and runs on Enter", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Get started</Button>);
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button).toBe(document.activeElement);
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ignores presses and skips Tab when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Get started</Button>);
    const button = screen.getByRole("button", { name: "Get started" });
    await userEvent.click(button);
    await userEvent.tab();
    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toBe(document.activeElement);
  });

  it("renders a link button as a link and names an icon button by its label", () => {
    render(
      <>
        <ButtonLink href="/signup" variant="text">Get a demo</ButtonLink>
        <IconButton label="Scroll to top">↑</IconButton>
      </>,
    );
    expect(screen.getByRole("link", { name: "Get a demo" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("button", { name: "Scroll to top" })).toBeTruthy();
  });
});

describe("Button waiting", () => {
  it("shows the ring and its wait text, dims, and stays focusable", () => {
    render(<Button waiting waitLabel="Saving…">Save changes</Button>);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.querySelector("svg")).not.toBeNull();
    button.focus();
    expect(button).toBe(document.activeElement);
  });

  it("keeps its own label when it has no wait text", () => {
    render(<Button waiting>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" }).querySelector("svg")).not.toBeNull();
  });

  it("ignores a second press, by pointer and by Enter in its form", async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Email" />
        <Button type="submit" waiting waitLabel="Sending…" onClick={onClick}>Send reset link</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sending…" }));
    await userEvent.type(screen.getByLabelText("Email"), "a{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps its label in place, hidden from screen readers, so it never gets narrower than before the wait", () => {
    render(<Button waiting waitLabel="Saving…">Save changes</Button>);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button.textContent).toBe("Save changesSaving…");
  });

  it("shrinks to its wait text when it does not hold its width", () => {
    render(<Button waiting waitLabel="Saving…" holdsWidth={false}>Skip for now</Button>);
    expect(screen.getByRole("button", { name: "Saving…" }).textContent).toBe("Saving…");
  });

  it("returns to its label and takes presses again when the wait ends", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button waiting waitLabel="Saving…" onClick={onClick}>Save changes</Button>);
    rerender(<Button waiting={false} waitLabel="Saving…" onClick={onClick}>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.querySelector("svg")).toBeNull();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("TextInput", () => {
  it("links its label and helper, and takes keyboard focus", async () => {
    render(<TextInput label="Thursday capacity" helper="Applies from next week's plan" />);
    await userEvent.tab();
    const input = screen.getByRole("textbox", { name: "Thursday capacity" });
    expect(input).toBe(document.activeElement);
    expect(description(input)).toBe("Applies from next week's plan");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("shows an error in place of the helper", () => {
    render(<TextInput label="Thursday capacity" helper="Applies from next week's plan" error="A day has 24 hours. Enter 24 h or less." defaultValue="25 h" />);
    const input = screen.getByRole("textbox", { name: "Thursday capacity" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
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
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(zone.getAttribute("data-state")).toBe("idle");
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("hands over every file chosen or dropped at once when it takes several", async () => {
    const onFiles = vi.fn();
    const sections = ["s1", "s2", "s3", "s4"].map((name) => new File(["png"], `${name}.png`, { type: "image/png" }));
    const { container } = render(<DropZone multiple label="All 4 section screenshots" onFiles={onFiles} />);
    const zone = screen.getByRole("button", { name: /All 4 section screenshots/ });
    expect(zone.textContent).toContain("Drop them here together or choose files");
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    expect(input.multiple).toBe(true);
    await userEvent.upload(input, sections);
    expect(onFiles).toHaveBeenLastCalledWith(sections);
    fireEvent.dragOver(zone, { dataTransfer: { files: sections } });
    expect(zone.textContent).toContain("Drop to add them");
    fireEvent.drop(zone, { dataTransfer: { files: sections.slice(0, 2) } });
    expect(onFiles).toHaveBeenLastCalledWith(sections.slice(0, 2));
  });

  it("names the error under the zone", () => {
    render(<DropZone label="Reading Comprehension screenshot" error="That file is 12.4 MB. Choose one that is 5 MB or less." onFile={vi.fn()} />);
    const zone = screen.getByRole("button", { name: /Reading Comprehension screenshot/ });
    expect(zone.getAttribute("data-state")).toBe("error");
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

  it("marks Today on the track when it has a due count", () => {
    render(<ProgressBar done={9} total={11} dueSoFar={11} />);
    expect(screen.getByText("2 behind")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
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
    expect(screen.getByRole("link", { name: "Progress" }).hasAttribute("aria-current")).toBe(false);
  });

  it("renders the page header band", () => {
    render(<PageHeader eyebrow="Week of September 28" title="Your plan for this week" lead="Your plan is set."
      notes={["Sufficient assumption comes first this week.", "Weaken sits out this week."]} />);
    expect(screen.getByRole("heading", { level: 1, name: "Your plan for this week" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent))
      .toEqual(["Sufficient assumption comes first this week.", "Weaken sits out this week."]);
  });

  it("shows Log in in the footer for signed-out visitors only", () => {
    const { unmount } = render(<Footer signedIn={false} />);
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
    unmount();
    render(<Footer signedIn />);
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("names DrillMap in the footer without making the logo a link", () => {
    render(<Footer signedIn />);
    expect(screen.getByRole("contentinfo").textContent).toContain("DrillMap");
    expect(screen.queryByRole("link", { name: "DrillMap" })).toBeNull();
  });

  it("renders the footer's legal links and AI line", () => {
    render(<Footer signedIn={false} />);
    expect(screen.getByText("Plans follow fixed rules. AI only reads your screenshots.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe("/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/legal/privacy");
    expect(screen.getByRole("link", { name: "AI Disclosure" }).getAttribute("href")).toBe("/legal/ai-disclosure");
  });
});
