import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";
import { closePostgresDatabase } from "../../src/lib/postgres";
import { actionCounters, runningScans, scanSpending } from "../../src/lib/postgresSchema";
import { scanWithLimits } from "../../src/lib/scanGuard";
import { freeScanPlace, takeScanPlace } from "../../src/lib/scanPlaces";

const WARNING_URL = "https://hc-ping.com/00000000-0000-4000-8000-000000000010";
const LIMIT_URL = "https://hc-ping.com/00000000-0000-4000-8000-000000000011";
const SEPTEMBER = new Date("2026-09-01T05:00:00Z");
const OCTOBER = new Date("2026-10-01T05:00:00Z");
const NOVEMBER = new Date("2026-11-01T05:00:00Z");
const MID_OCTOBER = new Date("2026-10-24T15:00:00Z");

let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
const originalSetting = process.env.DATABASE_URL;
const pings = vi.fn<typeof fetch>(async () => new Response("OK"));

beforeAll(async () => {
  await closePostgresDatabase();
  database = await createAppTestDatabase();
  process.env.DATABASE_URL = database.setting;
});
beforeEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  pings.mockClear();
  vi.stubGlobal("fetch", pings);
  vi.stubEnv("SCAN_SPEND_WARNING_PING_URL", WARNING_URL);
  vi.stubEnv("SCAN_LIMIT_REACHED_PING_URL", LIMIT_URL);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MID_OCTOBER);
  await database.owner.execute(sql`truncate action_counters, running_scans, scan_spending`);
  await database.owner.execute(sql`update scan_settings set scanning_off = false, monthly_limit_usd = 10`);
});
afterAll(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await closePostgresDatabase();
  process.env.DATABASE_URL = originalSetting;
  await database?.cleanup();
});

const monthTotals = async () => (await database.owner.select().from(scanSpending))
  .map(({ monthStart, totalUsd }) => ({ monthStart, totalUsd }))
  .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime());

async function setMonthTotal(monthStart: Date, totalUsd: string) {
  await database.owner.execute(sql`
    insert into scan_spending (month_start, total_usd) values (${monthStart.toISOString()}, ${totalUsd}::numeric)
    on conflict (month_start) do update set total_usd = excluded.total_usd
  `);
}

const pinged = () => pings.mock.calls.map(([url, init]) => ({ url: String(url), method: init?.method }));

async function scanAndFinish(subject: string, at: Date) {
  const place = await takeScanPlace(subject, "analytics", at);
  if ("subject" in place) await freeScanPlace(place, null);
  return place;
}

it("counts $0.02 before an analytics scan and $0.03 before a practice-test section, then keeps each reply's real cost", async () => {
  const totalsDuringReads: number[] = [];
  const analytics = await scanWithLimits("student-a", "analytics", async (recordCost) => {
    totalsDuringReads.push((await monthTotals())[0].totalUsd);
    recordCost(0.0071);
    return { rows: [] };
  });
  const section = await scanWithLimits("student-b", "practice-test-section", async (recordCost) => {
    totalsDuringReads.push((await monthTotals())[0].totalUsd);
    recordCost(0.012);
    return { reading: { page: "other" } };
  });

  expect([analytics.status, section.status]).toEqual([200, 200]);
  expect(totalsDuringReads).toEqual([0.02, 0.0371]);
  expect(await monthTotals()).toEqual([{ monthStart: OCTOBER, totalUsd: 0.0191 }]);
});

it("keeps the count after a timeout or an error with no reply, and uses the real cost when a reply did not fit its format", async () => {
  const timedOut = await scanWithLimits("student-a", "analytics", async () => { throw new Anthropic.APIConnectionTimeoutError(); });
  const failed = await scanWithLimits("student-a", "practice-test-section", async () => { throw new Error("synthetic network loss"); });
  const unreadable = await scanWithLimits("student-a", "analytics", async (recordCost) => {
    recordCost(0.005);
    throw new Error("The model's reply does not fit its format");
  });

  expect([timedOut.status, failed.status, unreadable.status]).toEqual([504, 502, 502]);
  expect(await monthTotals()).toEqual([{ monthStart: OCTOBER, totalUsd: 0.055 }]);
});

it("refuses either scan type at the limit minus $0.01 until the next month, starts no read, and counts nothing", async () => {
  await setMonthTotal(OCTOBER, "9.99");
  const read = vi.fn(async () => ({ rows: [] }));

  for (const kind of ["analytics", "practice-test-section"] as const) {
    const refused = await scanWithLimits("student-a", kind, read);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("Retry-After")).toBe(String((NOVEMBER.getTime() - MID_OCTOBER.getTime()) / 1000));
    expect(await refused.json()).toEqual({ error: "Scanning is off right now. Enter your analytics by hand.", reason: "scanning-off" });
  }

  expect(read).not.toHaveBeenCalled();
  expect(await monthTotals()).toEqual([{ monthStart: OCTOBER, totalUsd: 9.99 }]);
  expect(await database.owner.select().from(actionCounters)).toEqual([]);
  expect(await database.owner.select().from(runningScans)).toEqual([]);
});

it("allows the scan that brings the total exactly to the limit", async () => {
  await setMonthTotal(OCTOBER, "9.98");

  expect(await scanAndFinish("student-a", MID_OCTOBER)).toMatchObject({ subject: "student-a" });
  expect(await monthTotals()).toEqual([{ monthStart: OCTOBER, totalUsd: 10 }]);
});

it("starts the total at $0 at midnight on the 1st, Chicago time, and deletes months before last month", async () => {
  await setMonthTotal(SEPTEMBER, "4.00");
  await setMonthTotal(OCTOBER, "9.99");

  expect(await scanAndFinish("student-a", new Date("2026-11-01T04:59:59Z"))).toMatchObject({ refused: "scanning-off" });
  expect(await scanAndFinish("student-a", NOVEMBER)).toMatchObject({ subject: "student-a" });
  expect(await monthTotals()).toEqual([
    { monthStart: OCTOBER, totalUsd: 9.99 },
    { monthStart: NOVEMBER, totalUsd: 0.02 },
  ]);
});

it("still refuses a scan stamped before midnight on the 1st that runs after a scan of the new month", async () => {
  await setMonthTotal(OCTOBER, "9.99");

  expect(await scanAndFinish("student-a", NOVEMBER)).toMatchObject({ subject: "student-a" });
  expect(await scanAndFinish("student-b", new Date("2026-11-01T04:59:59Z"))).toMatchObject({ refused: "scanning-off" });
  expect(await monthTotals()).toEqual([
    { monthStart: OCTOBER, totalUsd: 9.99 },
    { monthStart: NOVEMBER, totalUsd: 0.02 },
  ]);
});

it("deletes months before last month also when every scan is refused at the limit", async () => {
  await setMonthTotal(SEPTEMBER, "4.00");
  await database.owner.execute(sql`update scan_settings set monthly_limit_usd = 0.01`);

  expect(await scanAndFinish("student-a", NOVEMBER)).toMatchObject({ refused: "scanning-off" });
  expect((await monthTotals()).map(({ monthStart }) => monthStart)).toEqual([NOVEMBER]);
});

it("applies the owner's switch and changed limit on the next scan", async () => {
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  expect(await scanAndFinish("student-a", MID_OCTOBER)).toEqual({
    refused: "scanning-off", message: "Scanning is off right now. Enter your analytics by hand.",
  });
  expect(await database.owner.select().from(actionCounters)).toEqual([]);

  await database.owner.execute(sql`update scan_settings set scanning_off = false, monthly_limit_usd = 0.01`);
  expect(await scanAndFinish("student-a", MID_OCTOBER)).toMatchObject({ refused: "scanning-off" });

  await database.owner.execute(sql`update scan_settings set monthly_limit_usd = 0.02`);
  expect(await scanAndFinish("student-a", MID_OCTOBER)).toMatchObject({ subject: "student-a" });
  expect(await monthTotals()).toEqual([{ monthStart: OCTOBER, totalUsd: 0.02 }]);
});

it("sends one fail signal when a scan moves the total to 80% of the limit, once each month", async () => {
  await setMonthTotal(OCTOBER, "7.97");
  expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(200);
  expect(pings).not.toHaveBeenCalled();

  expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(200);
  expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(200);
  expect(pinged()).toEqual([{ url: `${WARNING_URL}/fail`, method: "POST" }]);

  await setMonthTotal(NOVEMBER, "7.99");
  vi.setSystemTime(new Date("2026-11-02T15:00:00Z"));
  expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(200);
  expect(pinged()).toEqual([{ url: `${WARNING_URL}/fail`, method: "POST" }, { url: `${WARNING_URL}/fail`, method: "POST" }]);
});

it("sends one fail signal at the first refusal at the limit each month", async () => {
  await setMonthTotal(OCTOBER, "9.99");
  for (let index = 0; index < 3; index += 1) expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(429);
  expect(pinged()).toEqual([{ url: `${LIMIT_URL}/fail`, method: "POST" }]);

  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  vi.setSystemTime(new Date("2026-11-02T15:00:00Z"));
  expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(429);
  expect(pings).toHaveBeenCalledTimes(1);
});

it("tries a failed alert again on the next scan that meets its condition", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  await setMonthTotal(OCTOBER, "7.99");
  pings.mockResolvedValueOnce(new Response("", { status: 503 }));
  for (let index = 0; index < 3; index += 1) expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(200);
  expect(pinged()).toEqual([{ url: `${WARNING_URL}/fail`, method: "POST" }, { url: `${WARNING_URL}/fail`, method: "POST" }]);

  await setMonthTotal(OCTOBER, "9.99");
  pings.mockClear();
  pings.mockRejectedValueOnce(new TypeError("synthetic network loss"));
  for (let index = 0; index < 3; index += 1) expect((await scanWithLimits("student-a", "analytics", async () => ({}))).status).toBe(429);
  expect(pinged()).toEqual([{ url: `${LIMIT_URL}/fail`, method: "POST" }, { url: `${LIMIT_URL}/fail`, method: "POST" }]);
});

it("logs a missing or failing ping URL and still runs the scan", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("SCAN_SPEND_WARNING_PING_URL", undefined);
  await setMonthTotal(OCTOBER, "7.99");
  const read = vi.fn(async () => ({ rows: [] }));

  expect((await scanWithLimits("student-a", "analytics", read)).status).toBe(200);
  vi.stubEnv("SCAN_LIMIT_REACHED_PING_URL", LIMIT_URL);
  pings.mockRejectedValueOnce(new TypeError("synthetic network loss"));
  await setMonthTotal(OCTOBER, "9.99");
  expect((await scanWithLimits("student-a", "analytics", read)).status).toBe(429);

  expect(read).toHaveBeenCalledOnce();
  expect(logged.mock.calls.map(([line]) => JSON.parse(String(line)))).toEqual([
    { event: "spend_alert_not_configured", alert: "spend-warning", setting: "SCAN_SPEND_WARNING_PING_URL" },
    { event: "spend_alert_not_sent", alert: "limit-reached", error: "TypeError" },
  ]);
});
