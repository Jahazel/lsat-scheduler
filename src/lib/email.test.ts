import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearFakeEmails, emailLink, fakeEmails, sendEmail } from "./email";

const email = { to: "student@example.test", subject: "Verify your email", text: "Open this link: https://drillmap.xyz/x" };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "SITE_URL", "VERCEL"]) vi.stubEnv(name, undefined);
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  clearFakeEmails();
});

it("records the recipient, subject, and text with the fake sender, and writes the email to the log", async () => {
  expect(await sendEmail(email)).toEqual({ sent: true });
  expect(await sendEmail({ ...email, to: "other@example.test" })).toEqual({ sent: true });

  expect(fakeEmails()).toEqual([email, { ...email, to: "other@example.test" }]);
  expect(console.info).toHaveBeenCalledWith(expect.stringContaining(email.text));
  expect(fetchMock).not.toHaveBeenCalled();
  clearFakeEmails();
  expect(fakeEmails()).toEqual([]);
});

it("sends through Resend from the place's address when the place has a key and a from address", async () => {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "DrillMap <no-reply@mail.drillmap.xyz>");
  fetchMock.mockResolvedValue(Response.json({ id: "email-id" }));

  expect(await sendEmail(email)).toEqual({ sent: true });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe("https://api.resend.com/emails");
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer re_test_key");
  expect(JSON.parse(String(init?.body))).toEqual({
    from: "DrillMap <no-reply@mail.drillmap.xyz>", to: [email.to], subject: email.subject, text: email.text,
  });
  expect(fakeEmails()).toEqual([]);
});

it.each([
  { case: "Resend refuses the send", reply: () => Promise.resolve(Response.json({ name: "daily_quota_exceeded" }, { status: 429 })) },
  { case: "Resend cannot be reached", reply: () => Promise.reject(new TypeError("fetch failed")) },
])("returns a failure without throwing and logs it when $case", async ({ reply }) => {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "DrillMap <no-reply@mail.drillmap.xyz>");
  fetchMock.mockImplementation(reply);

  expect(await sendEmail(email)).toEqual({ sent: false });

  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Email not sent"));
  expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("re_test_key"));
  expect(fakeEmails()).toEqual([]);
});

it("fails and logs on a Vercel deployment without a Resend key, and never uses the fake sender there", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("EMAIL_FROM", "DrillMap <no-reply@mail.drillmap.xyz>");

  expect(await sendEmail(email)).toEqual({ sent: false });

  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Email not sent"));
  expect(fakeEmails()).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("builds a link from the configured site address when the request names another host", async () => {
  vi.stubEnv("SITE_URL", "https://drillmap.xyz");
  vi.stubEnv("AUTH_URL", "https://attacker.example");
  vi.stubEnv("VERCEL_URL", "attacker.example");
  const request = new Request("https://attacker.example/signup", {
    headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" },
  });

  const link = emailLink("/verify-email", { token: "abc_-123" });

  expect(new URL(request.url).host).toBe("attacker.example");
  expect(link).toBe("https://drillmap.xyz/verify-email?token=abc_-123");
  expect(emailLink("//attacker.example/reset", { token: "t" })).toMatch(/^https:\/\/drillmap\.xyz\//);
});

it("uses the local address off Vercel and refuses to build a link on Vercel without a site address", () => {
  expect(emailLink("/reset-password", { token: "t" })).toBe("http://localhost:3000/reset-password?token=t");
  vi.stubEnv("VERCEL", "1");
  expect(() => emailLink("/reset-password", { token: "t" })).toThrow("SITE_URL");
});

it("keeps the Resend key inside the email module, so callers send only through sendEmail", async () => {
  const files = (await readdir("src", { recursive: true })).filter((file) => /\.tsx?$/.test(file));
  const readers = [];
  for (const file of files) {
    if ((await readFile(path.join("src", file), "utf8")).includes("RESEND_API_KEY")) readers.push(file);
  }
  expect(readers.sort()).toEqual(["lib/email.test.ts", "lib/email.ts"]);
});
