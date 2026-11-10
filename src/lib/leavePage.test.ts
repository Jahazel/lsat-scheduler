// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { addLeaveGuard, leaveIsGuarded, leavePage, leavingLink, type LeaveGuard } from "./leavePage";

const removals: (() => void)[] = [];
afterEach(() => {
  removals.splice(0).forEach((remove) => remove());
  document.body.innerHTML = "";
});

function guard(answer: boolean) {
  const registered: LeaveGuard = { confirm: vi.fn(async () => answer), ended: vi.fn() };
  removals.push(addLeaveGuard(registered));
  return registered;
}

const control = () => document.body.appendChild(document.createElement("button"));

describe("leavePage", () => {
  it("goes at once and reports left when no guard is registered", async () => {
    const go = vi.fn(async () => "left" as const);
    expect(leaveIsGuarded()).toBe(false);
    expect(await leavePage(control(), go)).toBe("left");
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("stays without going when a guard says stay, and tells the guard", async () => {
    const stays = guard(false);
    const go = vi.fn(async () => "left" as const);
    const pressed = control();

    expect(await leavePage(pressed, go)).toBe("stayed");
    expect(stays.confirm).toHaveBeenCalledWith(pressed);
    expect(go).not.toHaveBeenCalled();
    expect(stays.ended).toHaveBeenCalledWith("stayed");
  });

  it("tells every guard when going fails, so each can ask again next time", async () => {
    const first = guard(true);
    const second = guard(true);

    expect(await leavePage(control(), async () => "failed")).toBe("failed");
    expect(first.ended).toHaveBeenCalledWith("failed");
    expect(second.ended).toHaveBeenCalledWith("failed");
  });

  it("reports failed to the guard when going throws", async () => {
    const leaves = guard(true);
    await expect(leavePage(control(), () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(leaves.ended).toHaveBeenCalledWith("failed");
  });

  it("asks no guard once it has been removed", async () => {
    const removed = guard(false);
    removals.pop()!();
    expect(await leavePage(control(), async () => "left")).toBe("left");
    expect(removed.confirm).not.toHaveBeenCalled();
  });
});

describe("leavingLink", () => {
  it.each([
    ["another page", '<a href="/dashboard"><span data-target>Go</span></a>', {}, true],
    ["another query", '<a href="/settings?tab=2">Go</a>', {}, true],
    ["this page", '<a href="/settings">Here</a>', {}, false],
    ["a section of this page", '<a href="/settings#goal">Goal</a>', {}, false],
    ["a new tab", '<a href="/dashboard" target="_blank">Go</a>', {}, false],
    ["a download", '<a href="/dashboard" download>Go</a>', {}, false],
    ["another site", '<a href="https://example.com/">Go</a>', {}, false],
    ["a modified click", '<a href="/dashboard">Go</a>', { metaKey: true }, false],
  ])("counts a link to %s as leaving: %s", (_name, html, init, leaves) => {
    window.history.pushState({}, "", "/settings");
    document.body.innerHTML = html;
    const target = document.querySelector("[data-target]") ?? document.querySelector("a")!;
    let found: HTMLAnchorElement | null = null;
    target.addEventListener("click", (event) => {
      found = leavingLink(event as MouseEvent);
      event.preventDefault();
    });
    target.dispatchEvent(new MouseEvent("click", { button: 0, bubbles: true, cancelable: true, ...init }));
    expect(found !== null).toBe(leaves);
  });
});
