// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type KeyboardEvent } from "react";
import { Dialog, DialogClose } from "./Dialog";

let finishExit: () => void;

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  HTMLDialogElement.prototype.getAnimations = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("data-closing")) return [];
    const finished = new Promise<void>((resolve) => (finishExit = resolve));
    return [{ finished } as unknown as Animation];
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Page({ onKeyDown }: { onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void }) {
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setOpener(event.currentTarget);
          setOpen(true);
        }}
      >
        Set up
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} returnFocusTo={opener} onKeyDown={onKeyDown} aria-label="Drill setup guide">
        <p>Step 1 of 5</p>
        <DialogClose />
      </Dialog>
    </>
  );
}

const guide = () => screen.getByRole("dialog", { name: "Drill setup guide" });

async function openGuide(onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void) {
  const user = userEvent.setup();
  render(<Page onKeyDown={onKeyDown} />);
  await user.click(screen.getByRole("button", { name: "Set up" }));
  return user;
}

async function endCloseMotion() {
  await act(async () => finishExit());
}

describe("Dialog", () => {
  it("stays closed until its opener is pressed", () => {
    render(<Page />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens as a modal named by its label, showing its content", async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    await openGuide();
    expect(guide()).toHaveProperty("open", true);
    expect(showModal).toHaveBeenCalledOnce();
    expect(screen.getByText("Step 1 of 5")).toBeTruthy();
  });

  it.each([
    ["its close control", (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Close" }))],
    ["Escape", (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
    ["a click on the dimmed page outside its content", (user: ReturnType<typeof userEvent.setup>) => user.click(guide())],
  ])("closes on %s and returns focus to the opener after the close motion", async (_, close) => {
    const user = await openGuide();
    screen.getByRole("button", { name: "Close" }).focus();

    await close(user);

    expect(guide()).toHaveProperty("open", true);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Set up" }));

    await endCloseMotion();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Set up" }));
  });

  it("passes keys other than Escape to its onKeyDown, and still closes on Escape", async () => {
    const keys: string[] = [];
    const user = await openGuide((event) => keys.push(event.key));
    screen.getByRole("button", { name: "Close" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(keys).toEqual(["ArrowRight"]);
    expect(guide().hasAttribute("data-closing")).toBe(false);

    await user.keyboard("{Escape}");
    expect(keys).toEqual(["ArrowRight"]);
    await endCloseMotion();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each([
    ["keeps the page's scrollbar space when the page has a scrollbar", 1009, true],
    ["reserves no scrollbar space when the page has no scrollbar", 1024, false],
  ])("%s", async (_, pageWidth, reserved) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(pageWidth);
    await openGuide();
    expect(document.documentElement.hasAttribute("data-page-scrollbar")).toBe(reserved);
  });

  it("returns focus to the opener it was given when the click did not focus it, as in Safari", async () => {
    const user = userEvent.setup();
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Set up" }));
    expect(document.activeElement).toBe(document.body);

    await user.click(screen.getByRole("button", { name: "Close" }));
    await endCloseMotion();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Set up" }));
  });

  it("stays open on a click inside its content", async () => {
    const user = await openGuide();
    await user.click(screen.getByText("Step 1 of 5"));
    expect(guide()).toHaveProperty("open", true);
    expect(guide().hasAttribute("data-closing")).toBe(false);
  });

  it("stays open when a press inside its content is released outside it", async () => {
    const user = await openGuide();
    await user.pointer([{ keys: "[MouseLeft>]", target: screen.getByText("Step 1 of 5") }, { keys: "[/MouseLeft]", target: guide() }]);
    expect(guide().hasAttribute("data-closing")).toBe(false);
  });

  it("can open again after it closed", async () => {
    const user = await openGuide();
    await user.keyboard("{Escape}");
    await endCloseMotion();
    await user.click(screen.getByRole("button", { name: "Set up" }));
    expect(guide()).toHaveProperty("open", true);
  });
});
