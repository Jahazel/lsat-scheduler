import { expect, it } from "vitest";
import { errorTypeOf } from "./securityLog";

it("keeps the error name and a database or system code, never the message", () => {
  const databaseError = Object.assign(new Error("password=hunter2"), { code: "57P01" });
  expect(errorTypeOf(new Error("Failed query", { cause: databaseError }))).toBe("Error:57P01");
  expect(errorTypeOf(Object.assign(new Error("connect"), { code: "ECONNREFUSED" }))).toBe("Error:ECONNREFUSED");
  expect(errorTypeOf(new TypeError("token abc"))).toBe("TypeError");
  expect(errorTypeOf("a thrown string")).toBe("unknown");
  const odd = new Error("x");
  odd.name = "Name with spaces";
  expect(errorTypeOf(odd)).toBe("unknown");
});
