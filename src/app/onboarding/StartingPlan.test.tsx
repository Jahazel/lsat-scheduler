// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import StartingPlan, { ASK_EVERY_MS, SLOW_AFTER_MS } from "./StartingPlan";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/onboarding" }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  router.push.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

it("waits for Stripe to confirm the plan, then opens This week", async () => {
  const hasPlanStarted = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<StartingPlan place="onboarding" hasPlanStarted={hasPlanStarted} />);

  expect(screen.getByRole("heading", { name: "Starting your plan…" })).toBeDefined();
  expect(screen.getByText("Stripe is confirming your card. This week opens next.")).toBeDefined();
  expect(screen.getByRole("progressbar", { name: "Starting your plan" })).toBeDefined();
  await wait(ASK_EVERY_MS);
  expect(router.push).not.toHaveBeenCalled();
  await wait(ASK_EVERY_MS);
  expect(router.push).toHaveBeenCalledWith("/dashboard");
});

it("says it is taking longer than usual after about 20 seconds, and Try again waits again", async () => {
  const hasPlanStarted = vi.fn().mockResolvedValue(false);
  render(<StartingPlan place="onboarding" hasPlanStarted={hasPlanStarted} />);

  await wait(SLOW_AFTER_MS - ASK_EVERY_MS);
  expect(screen.queryByText(/This is taking longer than usual\./)).toBeNull();
  await wait(ASK_EVERY_MS);
  expect(screen.getByText(/This is taking longer than usual\./)).toBeDefined();
  const asked = hasPlanStarted.mock.calls.length;
  await wait(ASK_EVERY_MS * 3);
  expect(hasPlanStarted).toHaveBeenCalledTimes(asked);

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.queryByText(/This is taking longer than usual\./)).toBeNull();
  hasPlanStarted.mockResolvedValue(true);
  await wait(ASK_EVERY_MS);
  expect(router.push).toHaveBeenCalledWith("/dashboard");
});

it("keeps waiting when one check cannot reach the server", async () => {
  const hasPlanStarted = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(true);
  render(<StartingPlan place="onboarding" hasPlanStarted={hasPlanStarted} />);

  await wait(ASK_EVERY_MS);
  expect(router.push).not.toHaveBeenCalled();
  await wait(ASK_EVERY_MS);
  expect(router.push).toHaveBeenCalledWith("/dashboard");
});

it("sends a lapsed student on to the weekly upload page once Stripe confirms the plan", async () => {
  const hasPlanStarted = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<StartingPlan place="weekly_upload" hasPlanStarted={hasPlanStarted} />);

  expect(screen.getByRole("heading", { name: "Starting your plan…" })).toBeDefined();
  expect(screen.getByText("Stripe is confirming your card. Your weekly upload opens next.")).toBeDefined();
  expect(screen.queryByText("Step 5 of 5 · Plan")).toBeNull();
  expect(screen.queryByRole("complementary")).toBeNull();
  await wait(ASK_EVERY_MS * 2);
  expect(router.push).toHaveBeenCalledWith("/dashboard/upload");
});
