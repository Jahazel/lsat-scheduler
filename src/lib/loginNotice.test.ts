import { describe, expect, it } from "vitest";
import { isSignInRefusal, loginNotice, loginRefusalPath } from "./loginNotice";
import type { SignInRefusal } from "./signInGate";

const REFUSALS = ["accountDisabled", "accountDeleted", "deletionWillFinish"] as const satisfies readonly SignInRefusal[];

const noticeAt = (path: string) => {
  const query = new URL(path, "https://drillmap.test").searchParams;
  return loginNotice({ error: query.get("error") ?? undefined, notice: query.get("notice") ?? undefined });
};

describe("loginRefusalPath", () => {
  it("keeps each refusal's Login address", () => {
    expect(REFUSALS.map(loginRefusalPath)).toEqual([
      "/login?error=AccountDisabled", "/login?notice=AccountDeleted", "/login?notice=DeletionWillFinish",
    ]);
  });

  it("leads to the notice that names the refusal", () => {
    expect(REFUSALS.map((refusal) => noticeAt(loginRefusalPath(refusal))?.text)).toEqual([
      "This Account can't log in.", "Your Account is deleted.", "Your Account is being deleted.",
    ]);
  });
});

it("tells sign-in refusals from the password form's own refusals", () => {
  expect(REFUSALS.every(isSignInRefusal)).toBe(true);
  expect(["wrongEmailOrPassword", "paused", "tooLong", "verifyYourEmail", "toString"].some(isSignInRefusal)).toBe(false);
});
