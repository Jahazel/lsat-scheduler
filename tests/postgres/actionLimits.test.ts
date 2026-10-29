import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { countAction, countAll, giveBack, loginTryCounts } from "../../src/lib/actionLimits";
import { actionCounters } from "../../src/lib/postgresSchema";
import { findStudentByAccountId } from "../../src/lib/studentRepository";

const request = vi.hoisted(() => ({ ip: "203.0.113.7", session: null as Session | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": request.ip }) }));
vi.mock("@/auth", () => ({ auth: async () => request.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

import { createStudentProfile } from "../../src/app/onboarding/actions";

const database = setUpAppTestDatabase();
beforeEach(async () => {
  request.ip = "203.0.113.7";
  request.session = null;
  vi.useRealTimers();
  await database.owner.execute(sql`truncate accounts, action_counters cascade`);
});
afterAll(() => {
  vi.useRealTimers();
});

const counterRows = () => database.owner.select().from(actionCounters);

async function countTimes(times: number, action: Parameters<typeof countAction>[0], subject: string, at: Date) {
  const results = [];
  for (let index = 0; index < times; index += 1) results.push(await countAction(action, subject, at));
  return results;
}

it("allows 5 snapshot saves in one Chicago day, refuses the 6th until midnight Central time, then allows again", async () => {
  const lateEvening = new Date("2026-10-24T04:30:00Z");
  expect(await countTimes(5, "analyticsSnapshotSave", "account-a", lateEvening)).toEqual(Array(5).fill({ allowed: true }));
  const chicagoMidnight = new Date("2026-10-24T05:00:00Z");
  expect(await countAction("analyticsSnapshotSave", "account-a", lateEvening))
    .toEqual({ allowed: false, windowEnd: chicagoMidnight });
  expect(await countAction("analyticsSnapshotSave", "account-a", new Date(chicagoMidnight.getTime() - 1)))
    .toEqual({ allowed: false, windowEnd: chicagoMidnight });
  expect(await countAction("analyticsSnapshotSave", "account-b", lateEvening)).toEqual({ allowed: true });

  expect(await countAction("analyticsSnapshotSave", "account-a", chicagoMidnight)).toEqual({ allowed: true });
  expect(await counterRows()).toEqual([{
    action: "analyticsSnapshotSave", subject: "account-a", windowStart: chicagoMidnight,
    windowEnd: new Date("2026-10-25T05:00:00Z"), count: 1,
  }]);
});

it("ends the Chicago day at local midnight across a daylight time change", async () => {
  await countTimes(5, "analyticsSnapshotSave", "account-a", new Date("2026-11-01T12:00:00Z"));
  expect(await countAction("analyticsSnapshotSave", "account-a", new Date("2026-11-01T12:00:00Z")))
    .toEqual({ allowed: false, windowEnd: new Date("2026-11-02T06:00:00Z") });
});

it("counts failed logins for an email in 15-minute windows", async () => {
  const at = new Date("2026-10-24T15:44:59Z");
  expect(await countTimes(10, "failedLoginForEmail", "maya.chen@fastmail.com", at)).toEqual(Array(10).fill({ allowed: true }));
  expect(await countAction("failedLoginForEmail", "maya.chen@fastmail.com", at))
    .toEqual({ allowed: false, windowEnd: new Date("2026-10-24T15:45:00Z") });
  expect(await countAction("failedLoginForEmail", "maya.chen@fastmail.com", new Date("2026-10-24T15:45:00Z"))).toEqual({ allowed: true });
});

it("a refused countAll gives back every count it took, and giveBack returns a count taken at the same time", async () => {
  const at = new Date("2026-10-24T15:10:00Z");
  const tries = loginTryCounts("maya.chen@fastmail.com", "203.0.113.7");
  await countTimes(50, "failedLoginFromIpAddress", "203.0.113.7", at);
  expect(await countAll(tries, { route: "/login", ipAddress: "203.0.113.7", realNow: at })).toBe("overLimit");
  expect((await counterRows()).map((row) => [row.action, row.count])).toEqual([["failedLoginFromIpAddress", 50]]);

  const later = new Date("2026-10-24T16:10:00Z");
  expect(await countAll(tries, { route: "/login", ipAddress: "203.0.113.7", realNow: later })).toBeNull();
  expect(await countAll(tries, { route: "/login", ipAddress: "203.0.113.7", realNow: later })).toBeNull();
  await giveBack(tries, later);
  expect((await counterRows()).map((row) => [row.action, row.count]).sort()).toEqual([["failedLoginForEmail", 1], ["failedLoginFromIpAddress", 1]]);
  await giveBack(tries, later);
  expect(await counterRows()).toEqual([]);
});

it("two give-backs at the same moment each take one count off", async () => {
  const at = new Date("2026-10-24T15:10:00Z");
  const tries = loginTryCounts("maya.chen@fastmail.com", "203.0.113.7");
  await countAll(tries, { route: "/login", ipAddress: "203.0.113.7", realNow: at });
  await countAll(tries, { route: "/login", ipAddress: "203.0.113.7", realNow: at });
  let both: Promise<unknown> = Promise.resolve();
  await database.owner.transaction(async (tx) => {
    await tx.execute(sql`select * from action_counters for update`);
    both = Promise.all([giveBack(tries, at), giveBack(tries, at)]);
    for (let waiting = 0; waiting < 2;) {
      [{ waiting }] = (await database.owner.execute(sql`
        select count(*)::int as waiting from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'
      `)).rows as [{ waiting: number }];
    }
  });
  await both;
  expect(await counterRows()).toEqual([]);
});

it("allows 10 signups from one IP address in one hour and refuses the 11th until the hour ends", async () => {
  const at = new Date("2026-10-24T15:59:59Z");
  expect(await countTimes(10, "signupFromIpAddress", "203.0.113.7", at)).toEqual(Array(10).fill({ allowed: true }));
  expect(await countAction("signupFromIpAddress", "203.0.113.7", at)).toEqual({ allowed: false, windowEnd: new Date("2026-10-24T16:00:00Z") });
  expect(await countAction("signupFromIpAddress", "203.0.113.7", new Date("2026-10-24T16:00:00Z"))).toEqual({ allowed: true });
});

it("lets exactly 5 of 10 requests at the same time through", async () => {
  const at = new Date("2026-10-24T15:00:00Z");
  const results = await Promise.all(Array.from({ length: 10 }, () => countAction("analyticsSnapshotSave", "account-a", at)));
  expect(results.filter(({ allowed }) => allowed)).toHaveLength(5);
});

it("does not wait for an ended counter row that another save holds", async () => {
  await countAction("signupFromIpAddress", "203.0.113.7", new Date("2026-10-24T14:30:00Z"));
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  let locked = () => {};
  const isLocked = new Promise<void>((resolve) => { locked = resolve; });
  const holder = database.owner.transaction(async (tx) => {
    await tx.execute(sql`select * from action_counters for update`);
    locked();
    await held;
  });
  await isLocked;
  try {
    const counted = await Promise.race([
      countAction("analyticsSnapshotSave", "account-a", new Date("2026-10-24T16:00:00Z")),
      new Promise((resolve) => setTimeout(() => resolve("waited"), 2000)),
    ]);
    expect(counted).toEqual({ allowed: true });
  } finally {
    release();
    await holder;
  }
  await countAction("analyticsSnapshotSave", "account-a", new Date("2026-10-24T16:00:00Z"));
  expect((await counterRows()).map(({ action }) => action)).toEqual(["analyticsSnapshotSave"]);
});

it("onboarding shares the snapshot save counter and refuses before any write", async () => {
  const account = await database.createAccountAsOwner({ email: "student@example.test", name: "Sam" });
  if (!account) throw new Error("Account fixture already exists");
  request.session = { user: { id: account.id, role: "student", email: "student@example.test", name: "Sam" }, expires: "2099-01-01" };
  await countTimes(5, "analyticsSnapshotSave", account.id, new Date());
  const now = new Date().toISOString();
  const input = {
    currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01", preferredPracticeTestDay: "SATURDAY" as const,
    accommodationMultiplier: 1 as const,
    dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
    officialAttempts: [],
    analyticsRows: [{ type: "Strengthen" as const, category: "regular" as const, accuracy: 0.6 }],
    analyticsApproval: {
      extraction: { source: "7sage_screenshot" as const, extractedAt: now },
      confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: now },
    },
  };
  expect(await createStudentProfile(input))
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect(await findStudentByAccountId(account.id)).toBeNull();

  await expect(createStudentProfile({ ...input, analyticsRows: [], analyticsApproval: null })).rejects.toThrow("redirect:/dashboard");
  expect(await findStudentByAccountId(account.id)).not.toBeNull();
});

it("counts only the onboarding save that wrote a snapshot when several run at the same time", async () => {
  const account = await database.createAccountAsOwner({ email: "student@example.test", name: "Sam" });
  if (!account) throw new Error("Account fixture already exists");
  request.session = { user: { id: account.id, role: "student", email: "student@example.test", name: "Sam" }, expires: "2099-01-01" };
  const now = new Date().toISOString();
  const input = {
    currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01", preferredPracticeTestDay: "SATURDAY" as const,
    accommodationMultiplier: 1 as const,
    dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
    officialAttempts: [],
    analyticsRows: [{ type: "Strengthen" as const, category: "regular" as const, accuracy: 0.6 }],
    analyticsApproval: {
      extraction: { source: "7sage_screenshot" as const, extractedAt: now },
      confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: now },
    },
  };
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => createStudentProfile(input)));
  expect(results.map((result) => result.status === "rejected" && String(result.reason))).toEqual(Array(5).fill("Error: redirect:/dashboard"));
  const student = await findStudentByAccountId(account.id);
  expect((await database.owner.execute(sql`select id from analytics_snapshots where student_id = ${student?.id}`)).rows).toHaveLength(1);

  expect(await countTimes(4, "analyticsSnapshotSave", account.id, new Date())).toEqual(Array(4).fill({ allowed: true }));
  expect(await countAction("analyticsSnapshotSave", account.id, new Date())).toMatchObject({ allowed: false });
});
