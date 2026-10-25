import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { png, screenshotRequest } from "../../src/lib/screenshotFixtures/files";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";
import { actionCounters, runningScans } from "../../src/lib/postgresSchema";
import { freeScanPlace, takeScanPlace, type ScanPlace, type ScanRefusal } from "../../src/lib/scanPlaces";

const request = vi.hoisted(() => ({ accountId: "student-a", extractor: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: request.accountId, role: "student" } }) }));
vi.mock("@/lib/screenshotExtractor", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/lib/screenshotExtractor")>();
  request.extractor.mockImplementation(original.extractAnalyticsRows);
  return { ...original, extractAnalyticsRows: request.extractor };
});

import { POST } from "../../src/app/api/analytics/extract/route";

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});
beforeEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  request.accountId = "student-a";
  request.extractor.mockClear();
  await database.owner.execute(sql`truncate action_counters, running_scans`);
});
afterAll(async () => {
  vi.useRealTimers();
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

const counts = async () => (await database.owner.select().from(actionCounters))
  .map(({ action, subject, count }) => ({ action, subject, count }))
  .sort((a, b) => a.action.localeCompare(b.action));

async function scanAndFinish(subject: string, at: Date) {
  const place = await takeScanPlace(subject, at);
  if ("subject" in place) await freeScanPlace(place);
  return place;
}

async function scanTimes(times: number, subject: string, at: Date) {
  for (let index = 0; index < times; index += 1) expect(await scanAndFinish(subject, at)).toEqual({ subject, startedAt: at });
}

it("allows 10 scans in one Chicago day and refuses the 11th until midnight Central time, counting nothing", async () => {
  const evening = new Date("2026-10-24T23:00:00Z");
  await scanTimes(10, "student-a", evening);

  expect(await scanAndFinish("student-a", evening)).toEqual({
    refused: "daily-limit",
    message: "You've read 10 screenshots today. You can scan again tomorrow, after midnight Central time.",
    retryAt: new Date("2026-10-25T05:00:00Z"),
  });
  expect(await counts()).toEqual([
    { action: "scanInDay", subject: "student-a", count: 10 },
    { action: "scanInMonth", subject: "student-a", count: 10 },
  ]);
  expect(await scanAndFinish("student-b", evening)).toMatchObject({ subject: "student-b" });
  expect(await scanAndFinish("student-a", new Date("2026-10-25T05:00:00Z"))).toMatchObject({ subject: "student-a" });
});

it("allows 40 scans in one Chicago month and refuses the 41st until the 1st, even on a day also at its limit", async () => {
  for (const day of ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]) await scanTimes(10, "student-a", new Date(`${day}T15:00:00Z`));

  expect(await scanAndFinish("student-a", new Date("2026-10-04T16:00:00Z"))).toMatchObject({
    refused: "monthly-limit", retryAt: new Date("2026-11-01T05:00:00Z"),
  });
  const lastEvening = new Date("2026-11-01T04:59:59Z");
  expect(await scanAndFinish("student-a", lastEvening)).toEqual({
    refused: "monthly-limit",
    message: "You've read 40 screenshots this month. You can scan again on Nov 1.",
    retryAt: new Date("2026-11-01T05:00:00Z"),
  });
  expect(await scanAndFinish("student-a", new Date("2026-11-01T05:00:00Z"))).toMatchObject({ subject: "student-a" });
});

it("refuses a second scan while one runs, counts nothing for it, and allows it after the first ends", async () => {
  const at = new Date("2026-10-24T15:00:00Z");
  const first = await takeScanPlace("student-a", at) as ScanPlace;

  expect(await takeScanPlace("student-a", new Date("2026-10-24T15:00:10Z"))).toEqual({
    refused: "still-reading",
    message: "We're still reading your last screenshot. Wait a moment, then try this one.",
    retryAt: new Date("2026-10-24T15:02:00Z"),
  });
  expect(await counts()).toEqual([
    { action: "scanInDay", subject: "student-a", count: 1 },
    { action: "scanInMonth", subject: "student-a", count: 1 },
  ]);

  await freeScanPlace(first);
  expect(await takeScanPlace("student-a", new Date("2026-10-24T15:00:20Z"))).toMatchObject({ subject: "student-a" });
});

it("frees a place 2 minutes after it started even when its scan never ended", async () => {
  await takeScanPlace("student-a", new Date("2026-10-24T15:00:00Z"));

  expect(await takeScanPlace("student-a", new Date("2026-10-24T15:01:59.999Z"))).toMatchObject({ refused: "still-reading" });
  expect(await takeScanPlace("student-a", new Date("2026-10-24T15:02:00Z"))).toMatchObject({ subject: "student-a" });
  expect(await database.owner.select().from(runningScans)).toEqual([{ subject: "student-a", startedAt: new Date("2026-10-24T15:02:00Z") }]);
});

it("refuses a 6th running scan on the site until the first place frees", async () => {
  for (let index = 1; index <= 5; index += 1) await takeScanPlace(`student-${index}`, new Date(`2026-10-24T15:00:0${index}Z`));

  expect(await takeScanPlace("student-6", new Date("2026-10-24T15:00:30Z"))).toEqual({
    refused: "site-busy",
    message: "Many students are scanning right now. Wait a moment, then try this one.",
    retryAt: new Date("2026-10-24T15:02:01Z"),
  });
  expect(await counts()).not.toContainEqual(expect.objectContaining({ subject: "student-6" }));
  expect(await takeScanPlace("student-6", new Date("2026-10-24T15:02:01Z"))).toMatchObject({ subject: "student-6" });
});

it("gives the last free place to exactly 1 of 6 students who start at the same time", async () => {
  const at = new Date("2026-10-24T15:00:00Z");
  for (let index = 1; index <= 4; index += 1) await takeScanPlace(`running-${index}`, at);
  await Promise.all(Array.from({ length: 3 }, () => getPostgresDatabase().execute(sql`select 1`)));
  const results = await Promise.all(Array.from({ length: 6 }, (_, index) => takeScanPlace(`student-${index}`, at)));

  expect(results.filter((result) => "subject" in result)).toHaveLength(1);
  expect(results.filter((result): result is ScanRefusal => "refused" in result).map(({ refused }) => refused)).toEqual(Array(5).fill("site-busy"));
  expect(await database.owner.select().from(runningScans)).toHaveLength(5);
});

it("gives one student exactly 1 place and 1 count from 6 scans at the same time", async () => {
  const at = new Date("2026-10-24T15:00:00Z");
  const results = await Promise.all(Array.from({ length: 6 }, () => takeScanPlace("student-a", at)));

  expect(results.filter((result) => "subject" in result)).toHaveLength(1);
  expect(await counts()).toEqual([
    { action: "scanInDay", subject: "student-a", count: 1 },
    { action: "scanInMonth", subject: "student-a", count: 1 },
  ]);
});

it("lets exactly 1 of 6 scans at the same time through when the student has 1 scan left today", async () => {
  const at = new Date("2026-10-24T15:00:00Z");
  await scanTimes(9, "student-a", at);
  await Promise.all(Array.from({ length: 3 }, () => getPostgresDatabase().execute(sql`select 1`)));
  const results = await Promise.all(Array.from({ length: 6 }, () => takeScanPlace("student-a", at)));

  expect(results.filter((result) => "subject" in result)).toHaveLength(1);
  expect(await counts()).toEqual([
    { action: "scanInDay", subject: "student-a", count: 10 },
    { action: "scanInMonth", subject: "student-a", count: 10 },
  ]);
});

it("counts each scan route call against the real clock and refuses the 11th without running the extractor", async () => {
  vi.stubEnv("SCREENSHOT_EXTRACTOR", "fake");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-24T15:00:00Z"));
  const scan = async () => POST(await screenshotRequest("http://localhost/api/analytics/extract", {
    image: new File([new Uint8Array(png(40, 30))], "lr.png", { type: "image/png" }),
    section: "LR",
  }));

  for (let index = 0; index < 10; index += 1) expect((await scan()).status).toBe(200);
  expect(await database.owner.select().from(runningScans)).toEqual([]);
  const refused = await scan();

  expect(refused.status).toBe(429);
  expect(refused.headers.get("Retry-After")).toBe(String(14 * 60 * 60));
  expect((await refused.json()).reason).toBe("daily-limit");
  expect(request.extractor).toHaveBeenCalledTimes(10);
});
