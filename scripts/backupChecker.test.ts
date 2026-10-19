import { describe, expect, it } from "vitest";
import { runBackupCheck } from "./backupChecker";

const now = new Date("2026-10-17T12:00:00Z");
const env = {
  BACKUP_PROJECT_ID: "production-project",
  BACKUP_BRANCH_ID: "br-production",
  NEON_API_KEY: "synthetic-key-only",
  HEALTHCHECKS_PING_URL: "https://hc-ping.com/00000000-0000-4000-8000-000000000000",
  HEALTHCHECKS_RETENTION_PING_URL: "https://hc-ping.com/00000000-0000-4000-8000-000000000001",
};

function snapshot(timestamp = "2026-10-17T11:00:00Z", source_branch_id = "br-production") {
  return { id: `snapshot-${source_branch_id}`, source_branch_id, timestamp, created_at: timestamp, manual: false };
}

function receiver(pages: unknown[]) {
  const requests: { url: URL; body: string }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, body: String(init?.body ?? "") });
    if (url.hostname === "hc-ping.com") return new Response("OK");
    return Response.json(pages.shift());
  };
  return { requests, fetcher };
}

describe("backup checker entry point", () => {
  it("alerts the primary monitor if retention alert delivery fails", async () => {
    const messages: { url: string; body: string }[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (!url.startsWith("https://hc-ping.com/")) return Response.json({ snapshots: [snapshot()] });
      messages.push({ url, body: String(init?.body) });
      return new Response("OK", { status: url.startsWith(env.HEALTHCHECKS_RETENTION_PING_URL) ? 503 : 200 });
    };
    expect(await runBackupCheck({ env, now: () => now, fetcher })).toEqual({ ok: false, status: "alert-failed" });
    expect(messages.at(-1)).toEqual({ url: env.HEALTHCHECKS_PING_URL + "/fail", body: '{"ok":false,"status":"alert-failed"}' });
  });

  it.each([undefined, env.HEALTHCHECKS_PING_URL])("refuses absent or shared retention destinations", async (url) => {
    const network = receiver([]);
    expect(await runBackupCheck({ env: { ...env, HEALTHCHECKS_RETENTION_PING_URL: url }, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "configuration-failed" });
    expect(network.requests.every((request) => request.url.hostname === "hc-ping.com" && request.url.pathname.endsWith("/fail"))).toBe(true);
  });

  it("sends overdue retention to its own failure monitor while keeping freshness healthy", async () => {
    const network = receiver([{ snapshots: [snapshot(), { ...snapshot("2026-09-01T00:00:00Z"), id: "old" }] }]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(result).toMatchObject({ ok: false, status: "retention-overdue" });
    expect(network.requests.at(-2)?.url.href).toBe(env.HEALTHCHECKS_RETENTION_PING_URL + "/fail");
    expect(network.requests.at(-1)?.url.href).toBe(env.HEALTHCHECKS_PING_URL);
  });

  it("retention reporting leaves the main monitor ready to alert on a later stale backup", async () => {
    const old = { ...snapshot("2026-09-01T00:00:00Z"), id: "retained-latest" };
    const network = receiver([{ snapshots: [snapshot(), old] }, { snapshots: [old] }]);
    const fresh = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(fresh).toMatchObject({ ok: false, status: "retention-overdue", expired: [{ kind: "scheduled" }] });
    expect(network.requests.at(-1)?.url.pathname.endsWith("/fail")).toBe(false);
    const stale = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(stale).toMatchObject({ ok: false, status: "stale" });
    expect(network.requests.at(-1)?.url.pathname.endsWith("/fail")).toBe(true);
  });

  it.each([{ next_cursor: "second-page" }, { has_more: true }])("refuses unknown top-level pagination %j", async (pagination) => {
    const network = receiver([{ snapshots: [snapshot()], ...pagination }]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "checker-failed" });
  });

  it("fails when a fresh backup result cannot reach the monitor", async () => {
    const fetcher: typeof fetch = async (input) => String(input).startsWith("https://hc-ping.com/")
      ? new Response("unavailable", { status: 503 }) : Response.json({ snapshots: [snapshot()] });
    expect(await runBackupCheck({ env, now: () => now, fetcher })).toEqual({ ok: false, status: "alert-failed" });
  });

  it("cannot report success when a later page fails", async () => {
    let page = 0;
    const fetcher: typeof fetch = async (input) => {
      if (String(input).startsWith("https://hc-ping.com/")) return new Response("OK");
      return page++ === 0
        ? Response.json({ snapshots: [snapshot()], pagination: { cursor: "second-page" } })
        : new Response("private-provider-error", { status: 503 });
    };
    expect(await runBackupCheck({ env, now: () => now, fetcher }))
      .toEqual({ ok: false, status: "checker-failed" });
  });

  it("fails rather than ignoring a new pagination convention", async () => {
    const network = receiver([{ snapshots: [snapshot()], pagination: { next_cursor: "next" } }]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "checker-failed" });
  });

  it("bounds a provider that never stops returning distinct pages", async () => {
    let page = 0;
    const fetcher: typeof fetch = async (input) => String(input).startsWith("https://hc-ping.com/")
      ? new Response("OK")
      : Response.json({ snapshots: [], pagination: { cursor: String(++page) } });
    expect(await runBackupCheck({ env, fetcher })).toEqual({ ok: false, status: "checker-failed" });
    expect(page).toBe(100);
  });

  it("never relays a network exception containing credentials", async () => {
    const network = receiver([]);
    const fetcher: typeof fetch = async (input, init) => {
      if (String(input).startsWith("https://hc-ping.com/")) return network.fetcher(input, init);
      throw new Error(`Request failed for ${env.NEON_API_KEY} postgresql://private@example.test/db`);
    };
    expect(await runBackupCheck({ env, fetcher })).toEqual({ ok: false, status: "checker-failed" });
    expect(network.requests[0].body).toBe('{"ok":false,"status":"checker-failed"}');
  });

  it("rejects malformed JSON and refuses redirects", async () => {
    const network = receiver([]);
    const fetcher: typeof fetch = async (input, init) => {
      expect(init?.redirect).toBe("error");
      if (String(input).startsWith("https://hc-ping.com/")) return network.fetcher(input, init);
      return new Response("{not-json");
    };
    expect(await runBackupCheck({ env, fetcher })).toEqual({ ok: false, status: "checker-failed" });
  });

  it("chooses the newest matching backup without relying on response order", async () => {
    const network = receiver([{ snapshots: [
      { ...snapshot("2026-10-15T12:00:00Z"), id: "older" },
      snapshot("2026-10-17T12:00:00+00:00"),
    ] }]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toMatchObject({ ok: true, status: "fresh", newestAgeHours: 0 });
  });

  it.each(["", "https://other.example.test/private", "https://hc-ping.com/invalid", "http://hc-ping.com/00000000-0000-4000-8000-000000000000"])("refuses an invalid primary destination and alerts through the valid retention monitor", async (url) => {
    const network = receiver([]);
    expect(await runBackupCheck({ env: { ...env, HEALTHCHECKS_PING_URL: url }, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "configuration-failed" });
    expect(network.requests).toHaveLength(1);
    expect(network.requests[0].url.href).toBe(env.HEALTHCHECKS_RETENTION_PING_URL + "/fail");
  });

  it.each([
    { snapshots: [snapshot("2026-10-17T12:00:01Z")] },
    { snapshots: [snapshot("2026-02-30T00:00:00Z")] },
    { snapshots: [snapshot("not-a-date")] },
    { snapshots: [{ ...snapshot(), timestamp: undefined, lsn: "0/3000000" }] },
    { snapshots: [{ ...snapshot(), source_branch_id: undefined }] },
    { snapshots: [{ ...snapshot(), created_at: "tomorrow" }] },
    { snapshots: [{ ...snapshot(), created_at: "2026-10-18T00:00:00Z" }] },
    { snapshots: [snapshot(), snapshot()] },
    { snapshots: null },
    {},
    { snapshots: [], pagination: { next: "unrecognized-page" } },
  ])("alerts on invalid or unreadable provider data %j", async (page) => {
    const network = receiver([page]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "checker-failed" });
    expect(network.requests.at(-1)?.url.pathname.endsWith("/fail")).toBe(true);
  });

  describe("backups Neon lists without a captured point", () => {
    const listed = (created_at: string, manual = false) => ({
      id: `listed-${created_at.replace(/\D/g, "")}-${manual}`, name: "production", source_branch_id: "br-production",
      created_at, expires_at: "2026-11-01T00:00:00Z", manual,
    });

    it.each([
      ["2026-10-17T00:00:17Z", "fresh"],
      ["2026-10-16T12:00:00Z", "fresh"],
      ["2026-10-16T11:59:59Z", "stale"],
    ])("ages a scheduled backup created at %s from its creation time", async (createdAt, status) => {
      const network = receiver([{ snapshots: [listed(createdAt)] }]);
      expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher })).toMatchObject({ status });
    });

    it("does not count a new manual backup, which can capture an earlier point, as fresh", async () => {
      const network = receiver([
        { snapshots: [listed("2026-10-17T11:59:00Z", true), listed("2026-10-16T06:00:00Z")] },
        { snapshots: [listed("2026-10-17T11:59:00Z", true)] },
      ]);
      expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
        .toMatchObject({ ok: false, status: "stale", newestAgeHours: 30 });
      expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
        .toMatchObject({ ok: false, status: "no-snapshots" });
    });

    it.each([
      ["2026-09-17T12:00:00Z", 0],
      ["2026-09-17T11:59:59Z", 1],
    ])("reports a manual backup created at %s by its creation age for retention", async (createdAt, overdue) => {
      const network = receiver([{ snapshots: [listed("2026-10-17T00:00:00Z"), listed(createdAt, true)] }]);
      const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
      expect(result).toMatchObject({ expired: overdue ? [{ kind: "manual" }] : [] });
    });
  });

  it("fails a repeated pagination cursor instead of reporting partial success", async () => {
    const network = receiver([
      { snapshots: [], pagination: { cursor: "repeat" } },
      { snapshots: [], pagination: { cursor: "repeat" } },
    ]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "checker-failed" });
  });

  it("reports both manual and retained scheduled snapshots older than 30 days across branches", async () => {
    const network = receiver([{ snapshots: [
      snapshot(),
      { ...snapshot("2026-09-16T12:00:00Z", "br-old"), id: "old-scheduled" },
      { ...snapshot("2026-09-16T12:00:00Z"), id: "old-manual", manual: true },
      { ...snapshot("2026-09-17T12:00:00Z"), id: "exactly-thirty-days" },
    ] }]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(result).toMatchObject({ status: "retention-overdue", expired: [
      { ageDays: 31, kind: "scheduled" }, { ageDays: 31, kind: "manual" },
    ] });
  });

  it("does not treat a new snapshot of old data as a fresh recovery point", async () => {
    const network = receiver([{ snapshots: [{ ...snapshot("2026-10-15T00:00:00Z"), created_at: now.toISOString() }] }]);
    expect(await runBackupCheck({ env, now: () => now, fetcher: network.fetcher }))
      .toMatchObject({ ok: false, status: "stale", newestAgeHours: 60 });
  });

  it.each([401, 403, 429, 500])("alerts on provider HTTP %i without relaying the response body", async (status) => {
    const messages: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      if (String(input).startsWith("https://hc-ping.com/")) {
        messages.push(String(init?.body));
        return new Response("OK");
      }
      return new Response("postgresql://secret@example.test/db", { status });
    };
    expect(await runBackupCheck({ env, fetcher })).toEqual({ ok: false, status: "checker-failed" });
    expect(messages).toEqual(['{"ok":false,"status":"checker-failed"}', '{"ok":false,"status":"checker-failed"}']);
  });

  it.each(["provider", "alert"])("fails on a %s timeout", async (boundary) => {
    const fetcher: typeof fetch = async (input, init) => {
      const isAlert = String(input).startsWith("https://hc-ping.com/");
      if ((boundary === "alert") === isAlert) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("private-error")), { once: true });
        });
      }
      return isAlert ? new Response("OK") : Response.json({ snapshots: [snapshot()] });
    };
    expect(await runBackupCheck({ env, now: () => now, fetcher })).toEqual({ ok: false, status: boundary === "alert" ? "alert-failed" : "checker-failed" });
  }, 25_000);

  it("does not mark an undelivered failure alert as success", async () => {
    const fetcher: typeof fetch = async (input) => String(input).startsWith("https://hc-ping.com/")
      ? new Response("secret-url", { status: 503 }) : Response.json({ snapshots: [] });
    expect(await runBackupCheck({ env, fetcher })).toEqual({ ok: false, status: "alert-failed" });
  });

  it("alerts on invalid configuration when the monitor destination remains valid", async () => {
    const network = receiver([]);
    expect(await runBackupCheck({ env: { ...env, BACKUP_BRANCH_ID: "" }, fetcher: network.fetcher }))
      .toEqual({ ok: false, status: "configuration-failed" });
    expect(network.requests.at(-1)?.url.pathname.endsWith("/fail")).toBe(true);
  });

  it("never forwards secrets, connection strings, names, or raw identifiers to alerts or output", async () => {
    const network = receiver([{ snapshots: [{
      ...snapshot("2026-09-01T00:00:00Z"), id: env.NEON_API_KEY,
      name: "postgresql://private:password@example.test/db", extra: env.HEALTHCHECKS_PING_URL, privateLabel: env.HEALTHCHECKS_RETENTION_PING_URL,
    }] }]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    const output = JSON.stringify(result) + network.requests.at(-1)?.body;
    expect(result).toMatchObject({ ok: false, status: "stale" });
    for (const secret of [env.NEON_API_KEY, env.HEALTHCHECKS_PING_URL, env.HEALTHCHECKS_RETENTION_PING_URL, "postgresql://", "private:password"])
      expect(output).not.toContain(secret);
  });

  it.each([
    [[], "no-snapshots"],
    [[snapshot("2026-10-17T11:00:00Z", "br-copy")], "no-snapshots"],
    [[snapshot("2026-10-16T12:00:00Z")], "fresh"],
    [[snapshot("2026-10-16T11:59:59.999Z"), snapshot("2026-10-17T11:00:00Z", "br-copy")], "stale"],
  ])("checks the production backup age for %j", async (snapshots, status) => {
    const network = receiver([{ snapshots }]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(result).toMatchObject({ ok: status === "fresh", status });
    expect(network.requests.at(-1)?.url.pathname.endsWith("/fail")).toBe(status !== "fresh");
  });

  it("inspects every page before reporting freshness and retention", async () => {
    const network = receiver([
      { snapshots: [snapshot()], pagination: { cursor: "page-two" } },
      { snapshots: [{ ...snapshot("2026-09-16T12:00:00Z"), id: "old-manual", manual: true }] },
    ]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(result).toMatchObject({ ok: false, status: "retention-overdue", expired: [
      { ageDays: 31, kind: "manual" },
    ] });
    expect(network.requests[1].url.searchParams.get("cursor")).toBe("page-two");
  });

  it("accepts a fresh snapshot only for the configured branch", async () => {
    const network = receiver([{ snapshots: [snapshot()] }]);
    const result = await runBackupCheck({ env, now: () => now, fetcher: network.fetcher });
    expect(result).toMatchObject({ ok: true, status: "fresh", newestAgeHours: 1 });
    expect(network.requests.at(-1)?.url.pathname).toBe("/00000000-0000-4000-8000-000000000000");
  });
});
