#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { resolve } from "node:path";
import { drive } from "./browser.mjs";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3) throw new Error("Usage: smoke.mjs .verification/evidence/<run-name>");
const email = "verify-smoke@example.test";
const REFUSED = "Google sign-in didn't finish. Try again, or use a Google account with a verified email.";
const WEEKLY_UPLOAD = /^Plan (this|next) week$/;
const dailyCapacities = (student) => Object.entries(student)
  .filter(([key]) => key.endsWith("_capacity_minutes"))
  .map(([, value]) => Number(value));
const PASSWORD = "a long phrase for the smoke run";
const WRONG_EMAIL_OR_PASSWORD = "That email and password don't match. Check both and try again, or reset your password.";

async function logInOnForm(page, email, password) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

async function refusedLogin(page, email, password, text) {
  await logInOnForm(page, email, password);
  await page.waitForFunction(() => document.querySelector("input[name=password]")?.value === "");
  await page.getByText(text, { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Email", { exact: true }).inputValue(), email);
}

async function verificationLink(email) {
  for (let tries = 0; tries < 20; tries++) {
    const log = readFileSync(resolve(directory, "app.log"), "utf8");
    const sent = [...log.matchAll(/Fake email to (\S+)\n[\s\S]*?(http:\/\/\S+\/verify-email\?token=[\w-]+)/g)].filter((match) => match[1] === email);
    if (sent.length) return new URL(sent.at(-1)[2]);
    await sleep(250);
  }
  throw new Error(`No verification email for ${email} in app.log.`);
}
const LIMITATIONS = ["No nonempty analytics or schedule history in the deletion fixture", "Google refusal and Disabled Account states are opened by their reason links; real Google sign-in and its refusals need the copy", "No capacity-notice settings entry, mobile navigation, or screenshot extraction"];

const result = await drive(directory, "smoke", async ({ page, url, log, goto, signInAs, heading, capture, records, newSession }) => {
  const initial = records("records-before");
  assert.equal(initial.accounts.length, 0, "Smoke requires an empty disposable database.");
  await goto("/");
  await capture("landing");
  log("Choose Build my first plan");
  await page.getByRole("link", { name: "Build my first plan", exact: true }).click();
  await heading("Sign up for DrillMap");
  await goto("/");
  log("Choose the public Sign up navigation link");
  await page.locator("header").getByRole("link", { name: "Sign up", exact: true }).click();
  await heading("Sign up for DrillMap");
  log("Choose the signup form's Log in link");
  await page.locator("main").getByRole("link", { name: "Log in", exact: true }).click();
  await heading("Log in to DrillMap");
  log("Choose the login form's Sign up link");
  await page.locator("main").getByRole("link", { name: "Sign up", exact: true }).click();
  await heading("Sign up for DrillMap");
  await goto("/");
  log("Choose the public Log in navigation link");
  await page.locator("header").getByRole("link", { name: "Log in", exact: true }).click();
  await heading("Log in to DrillMap");
  assert.deepEqual(await page.locator("main").getByRole("button").allTextContents(), ["Continue with Google", "Log in"]);
  assert.deepEqual(await page.locator("main input").evaluateAll((inputs) => inputs.map((input) => input.type)), ["email", "password"]);
  await capture("login-default");
  for (const [error, role, text] of [["AccessDenied", "alert", REFUSED], ["AccountDisabled", "alert", "This Account can't log in."], ["SessionEnded", "status", "Your session ended. Log in again."]]) {
    await goto(`/login?error=${error}`);
    assert.equal(await page.locator("main").getByRole(role).textContent(), text);
    await capture(`login-${error}`);
  }
  await goto("/signup");
  await capture("signup-default");
  await page.waitForLoadState("networkidle");
  log("Fill in name, email, and password, and press Create account without ticking the Terms and Privacy box");
  await page.getByLabel("Name", { exact: true }).fill("Smoke Student");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByText("Tick the box to continue.", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/signup");
  assert.equal(await page.getByRole("checkbox").getAttribute("aria-invalid"), "true");
  assert.equal(await page.getByLabel("Password", { exact: true }).inputValue(), PASSWORD);
  assert.equal(records("records-consent-refused").accounts.length, 0);
  await capture("signup-box-not-ticked");
  log("Tick the box and press Create account");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await heading("Check your email");
  await page.getByText(`We sent an email to ${email}. Open the link in it to finish signing up.`, { exact: true }).waitFor();
  await capture("check-your-email");
  assert.equal(records("records-pending-signup").accounts.length, 0, "A pending signup is not an Account.");
  log("Log in with the pending signup's email and password");
  await goto("/login");
  await page.waitForLoadState("networkidle");
  await refusedLogin(page, email, PASSWORD, "Verify your email first. We sent you a new link. Check your spam folder if you don't see it.");
  assert.equal(await page.getByLabel("Password", { exact: true }).getAttribute("aria-invalid"), null);
  await capture("login-verify-your-email");
  const link = await verificationLink(email);
  assert.equal(link.origin, url, "The email link uses this place's site address.");
  log("Open the logged verification link twice; opening it uses nothing");
  await goto(link.pathname + link.search);
  await heading("Verify your email");
  await page.reload();
  await heading("Verify your email");
  await capture("verify-email-ready");
  log("Press Verify my email");
  await page.getByRole("button", { name: "Verify my email", exact: true }).click();
  await page.getByText("Email verified. Log in.", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, "/login?notice=EmailVerified");
  await capture("login-email-verified");
  const verified = records("records-verified");
  assert.equal(verified.accounts.length, 1);
  log("Open the used link again");
  await goto(link.pathname + link.search);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Verify my email", exact: true }).click();
  await heading("This link doesn't work");
  await capture("verify-email-link-doesnt-work");
  log("Log in with a wrong password");
  await goto("/login");
  await page.waitForLoadState("networkidle");
  await refusedLogin(page, email, "a wrong phrase for the smoke run", WRONG_EMAIL_OR_PASSWORD);
  for (const label of ["Email", "Password"]) assert.equal(await page.getByLabel(label, { exact: true }).getAttribute("aria-invalid"), null);
  await capture("login-wrong-email-or-password");
  log("Log in with an unknown email; the message is the same");
  await refusedLogin(page, "verify-nobody@example.test", PASSWORD, WRONG_EMAIL_OR_PASSWORD);
  log("Log in with a password over 72 bytes");
  await refusedLogin(page, email, `${PASSWORD}${"x".repeat(72)}`, "That password is too long. Try a shorter one.");
  assert.equal(await page.getByLabel("Password", { exact: true }).getAttribute("aria-invalid"), "true");
  await capture("login-password-too-long");
  log("Fail 9 more logins for the unknown email, then try once more");
  for (let tries = 0; tries < 9; tries++) await refusedLogin(page, "verify-nobody@example.test", PASSWORD, WRONG_EMAIL_OR_PASSWORD);
  await refusedLogin(page, "verify-nobody@example.test", PASSWORD, "Too many tries. Login is paused for a while. Try again later, or reset your password.");
  await capture("login-paused");
  const failedLogins = records("records-login-paused").action_counters.find((row) => row.action === "failedLoginForEmail" && row.subject === "verify-nobody@example.test");
  assert.equal(failedLogins?.count, 10, "The paused try counted no failure.");
  log("Log in with the new password");
  await logInOnForm(page, email, PASSWORD);
  await heading("Set your target");
  assert.equal(new URL(page.url()).pathname, "/onboarding");
  const signedUp = records("records-signup");
  assert.equal(signedUp.accounts.length, 1);
  assert.equal(signedUp.accounts[0].email, email);
  assert.equal(signedUp.accounts[0].role, "student");
  assert.equal(signedUp.students.length, 0);
  await page.reload();
  await heading("Set your target");
  log("Enter scores 150 and 165 and June 2027 on Step 1 · Goal");
  await page.getByLabel("Current PT score", { exact: true }).fill("150");
  await page.getByLabel("Goal score", { exact: true }).fill("165");
  await page.getByLabel("Goal test date", { exact: true }).selectOption("2027-06-01");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await heading("Plan your week");
  log("Choose Saturday on Step 2 · Week");
  await page.getByText("Pick a practice-test day to continue.", { exact: true }).waitFor();
  await page.getByLabel("Practice test on Saturday", { exact: true }).check();
  await capture("onboarding-week");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await heading("Add your 7Sage analytics");
  log("Skip analytics for now");
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await heading(WEEKLY_UPLOAD);
  const onboarded = records("records-onboarding");
  assert.equal(onboarded.students.length, 1);
  assert.equal(onboarded.students[0].goal_score, 165);
  assert.equal(onboarded.students[0].preferred_practice_test_day, "SATURDAY");
  assert.equal(onboarded.students[0].goal_test_date, "2027-06-01");
  assert.deepEqual(dailyCapacities(onboarded.students[0]), Array(7).fill(90));
  assert.equal(onboarded.weekly_schedules.length, 0);
  log("Open Study settings through navigation");
  await page.getByRole("link", { name: "Study settings", exact: true }).click();
  await heading("Study settings");
  await page.getByRole("spinbutton", { name: "Goal score", exact: true }).fill("168");
  await page.getByRole("combobox", { name: "All days hours", exact: true }).selectOption("0");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  log("Set goal score 168, apply 30 minutes to all days, and save");
  await capture("settings-before-save");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await heading(WEEKLY_UPLOAD);
  await goto("/settings");
  await heading("Study settings");
  assert.equal(await page.getByRole("spinbutton", { name: "Goal score", exact: true }).inputValue(), "168");
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    assert.equal(await page.getByRole("combobox", { name: `${day} hours`, exact: true }).inputValue(), "0");
    assert.equal(await page.getByRole("combobox", { name: `${day} minutes`, exact: true }).inputValue(), "30");
  }
  const updated = records("records-settings");
  assert.equal(updated.students[0].goal_score, 168);
  assert.deepEqual(dailyCapacities(updated.students[0]), Array(7).fill(30));
  await capture("settings-reopened");
  log("Open Account through its menu");
  await page.getByRole("button", { name: `Account menu for ${email}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Account", exact: true }).click();
  await heading("Account");
  await capture("account");
  log("Log out and request protected Account directly");
  await page.getByRole("button", { name: `Account menu for ${email}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await page.waitForURL(url + "/?signedOut=1");
  await goto("/account");
  await heading("Log in to DrillMap");
  assert.equal(new URL(page.url()).search, "", "A signed-out browser sees Login with no reason.");
  assert.equal(await page.locator("main").getByRole("status").count(), 0);
  await signInAs(email);
  await goto("/dashboard");
  await heading(WEEKLY_UPLOAD);
  for (const path of ["/login", "/signup"]) {
    await goto(path);
    await heading(WEEKLY_UPLOAD);
    assert.equal(new URL(page.url()).pathname, "/dashboard/upload");
  }
  const second = await newSession("second");
  await second.signInAs(email);
  await second.goto("/account");
  await second.heading("Account");
  await goto("/account");
  await heading("Account");
  const deletion = page.locator("form").filter({ has: page.locator('input[name="confirmation"]') });
  await deletion.getByLabel("Current password", { exact: true }).fill(PASSWORD);
  await deletion.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  log("Delete the disposable student's Account");
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  await page.getByRole("link", { name: "Build my first plan", exact: true }).waitFor();
  const deleted = records("records-deleted");
  for (const collection of ["accounts", "students", "analytics_snapshots", "weekly_schedules", "activity_check_ins"]) assert.equal(deleted[collection].length, 0);
  log("Reload Account in the second browser after the deletion");
  await second.page.reload();
  await second.page.getByText("Your session ended. Log in again.", { exact: true }).waitFor();
  assert.equal(new URL(second.page.url()).pathname + new URL(second.page.url()).search, "/login?error=SessionEnded");
  await second.capture("deleted-account-second-browser");
});
console.log(`Passed Login and Signup states, onboarding, settings persistence, sign-out, Account deletion, and the ended session. Limits: ${LIMITATIONS.join("; ")}. Evidence: ${result.out}`);
