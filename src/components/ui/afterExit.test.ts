// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { afterExit } from "./afterExit";

it("resolves at once when the element runs no animation", async () => {
  const element = document.createElement("div");
  let done = false;
  void afterExit(element).then(() => (done = true));
  await Promise.resolve();
  await Promise.resolve();
  expect(done).toBe(true);
});

it("waits for every running animation, and treats a cancelled one as ended", async () => {
  let finishFade!: () => void;
  let cancelSlide!: () => void;
  const fade = new Promise<void>((resolve) => (finishFade = resolve));
  const slide = new Promise<void>((_, reject) => (cancelSlide = () => reject(new Error("AbortError"))));
  const element = document.createElement("div");
  element.getAnimations = () => [{ finished: fade }, { finished: slide }] as unknown as Animation[];

  let done = false;
  void afterExit(element).then(() => (done = true));
  cancelSlide();
  await new Promise((resolve) => setTimeout(resolve));
  expect(done).toBe(false);

  finishFade();
  await vi.waitFor(() => expect(done).toBe(true));
});
