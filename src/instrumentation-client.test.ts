import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("parses with Zod in the browser without evaluating a string as JavaScript", async () => {
  vi.resetModules();
  const evaluated = vi.fn();
  vi.stubGlobal(
    "Function",
    new Proxy(Function, {
      construct(target, args, newTarget) {
        evaluated();
        return Reflect.construct(target, args, newTarget);
      },
    }),
  );

  await import("./instrumentation-client");
  const { z } = await import("zod");

  expect(z.object({ email: z.string() }).parse({ email: "amy@example.test" })).toEqual({ email: "amy@example.test" });
  expect(evaluated).not.toHaveBeenCalled();
});
