// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { FailureCode } from "@/lib/unexpectedFailure";
import { callAction } from "./callAction";

afterEach(() => vi.unstubAllGlobals());

function stubAssign() {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  return assign;
}

it("passes the action its arguments and answers what the action answers", async () => {
  const action = vi.fn(async (a: number, b: string) => ({ refused: `${a}${b}` }));
  expect(await callAction(action)(1, "x")).toEqual({ refused: "1x" });
  expect(action).toHaveBeenCalledWith(1, "x");
});

it("answers no connection when the request never reaches the server", async () => {
  const lost = callAction(() => Promise.reject(new TypeError("Failed to fetch")));
  await expect(lost()).resolves.toEqual({ unexpectedFailure: "no-connection" });
});

it("lets a rejection that is not a lost connection reject", async () => {
  const failing = callAction(async () => {
    throw new Error("Server Action was not found");
  });
  await expect(failing()).rejects.toThrow("Server Action was not found");
});

it("loads the signed-out address as a new page and answers nothing", async () => {
  const assign = stubAssign();
  expect(await callAction(async () => ({ goTo: "/login" as const }))()).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

it("loads no page for an answer that is not a sign-out", async () => {
  const assign = stubAssign();
  const failure = { unexpectedFailure: "3f9a01c2" as FailureCode };
  expect(await callAction(async () => failure)()).toBe(failure);
  expect(assign).not.toHaveBeenCalled();
});
