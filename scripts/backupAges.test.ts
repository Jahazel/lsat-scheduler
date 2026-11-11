import { expect, it } from "vitest";
import { runBackupAgeCheck } from "./backupAges";

const now = new Date("2026-11-30T12:00:00Z");
const env = { BACKUP_PROJECT_ID: "copy-project", BACKUP_BRANCH_ID: "br-active", NEON_API_KEY: "synthetic-key-only" };
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const active = { id: "br-active", name: "production", created_at: daysAgo(200) };
const scheduled = (days: number, name = `scheduled ${days}`) =>
  ({ id: `snap-${name.replaceAll(" ", "-")}`, name, created_at: daysAgo(days), manual: false });

function neon({ snapshots = [scheduled(1)], branches = [active], branchPages, historySeconds = 86_400, status = 200 }: {
  snapshots?: object[];
  branches?: object[];
  branchPages?: object[];
  historySeconds?: number;
  status?: number;
}) {
  const paths: string[] = [];
  const pages = branchPages ?? [{ branches }];
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname + url.search);
    if (status !== 200) return new Response("unavailable", { status });
    if (url.pathname.endsWith("/snapshots")) return Response.json({ snapshots });
    if (url.pathname.endsWith("/branches")) return Response.json(pages.shift());
    return Response.json({ project: { history_retention_seconds: historySeconds } });
  };
  return { paths, fetcher };
}

const check = (network: ReturnType<typeof neon>, settings: Record<string, string | undefined> = env) =>
  runBackupAgeCheck({ env: settings, fetcher: network.fetcher, now: () => now });

it("passes when every snapshot and restore branch is at most 30 days old, and ignores the active branch's age", async () => {
  const network = neon({
    snapshots: [scheduled(1), scheduled(30)],
    branches: [active, { id: "br-restore", name: "restore test", created_at: daysAgo(2), parent_timestamp: daysAgo(29) }],
  });
  expect(await check(network)).toEqual({ ok: true, status: "within-30-days", tooOld: [] });
  expect(network.paths).toEqual(["/api/v2/projects/copy-project/snapshots", "/api/v2/projects/copy-project/branches"]);
});

it("fails on a snapshot and a restore branch older than 30 days and names each by its Neon name only", async () => {
  const network = neon({
    snapshots: [scheduled(1), scheduled(30.5, "Oct 30 nightly")],
    branches: [active, { id: "br-old-restore", name: "production_old_2026-10-20", created_at: daysAgo(31), parent_timestamp: daysAgo(31) }],
  });
  const result = await check(network);
  expect(result).toEqual({
    ok: false,
    status: "too-old",
    tooOld: [
      { kind: "snapshot", name: "Oct 30 nightly", ageDays: 30.5 },
      { kind: "branch", name: "production_old_2026-10-20", ageDays: 31 },
    ],
  });
  expect(JSON.stringify(result)).not.toMatch(/snap-|br-old-restore|synthetic-key/);
});

it("ages a new branch from the older point in time it was made from", async () => {
  const network = neon({
    branches: [active, { id: "br-from-past", name: "point in time", created_at: daysAgo(1), parent_timestamp: daysAgo(40) }],
  });
  expect(await check(network)).toMatchObject({ status: "too-old", tooOld: [{ kind: "branch", name: "point in time", ageDays: 40 }] });
});

it("ages a branch restored from a snapshot by the snapshot's data, and fails when that snapshot is gone", async () => {
  const restoredFromOld = { id: "br-a", name: "from old snapshot", created_at: daysAgo(1), restored_from: "snap-old" };
  const restoredFromGone = { id: "br-b", name: "from deleted snapshot", created_at: daysAgo(1), restored_from: "snap-gone" };
  const network = neon({
    snapshots: [{ ...scheduled(29), id: "snap-old" }],
    branches: [active, restoredFromOld, restoredFromGone],
  });
  expect(await check(network)).toEqual({
    ok: false, status: "too-old", tooOld: [{ kind: "branch", name: "from deleted snapshot", ageDays: "unknown" }],
  });
  const older = neon({ snapshots: [{ ...scheduled(31), id: "snap-old" }], branches: [active, restoredFromOld] });
  expect(await check(older)).toMatchObject({
    tooOld: [
      { kind: "snapshot", ageDays: 31 },
      { kind: "branch", name: "from old snapshot", ageDays: 31 },
    ],
  });
});

it("ages a manual snapshot with no captured time from the start of the restore history window", async () => {
  const manual = { id: "snap-manual", name: "manual", created_at: daysAgo(25), manual: true };
  expect(await check(neon({ snapshots: [manual], historySeconds: 6 * 86_400 })))
    .toMatchObject({ status: "too-old", tooOld: [{ name: "manual", ageDays: 31 }] });
  expect(await check(neon({ snapshots: [manual], historySeconds: 86_400 })))
    .toMatchObject({ status: "within-30-days" });
});

it("reads every page of branches", async () => {
  const network = neon({
    branchPages: [
      { branches: [active], pagination: { next: "page-2" } },
      { branches: [{ id: "br-late", name: "late page", created_at: daysAgo(45) }] },
    ],
  });
  expect(await check(network)).toMatchObject({ tooOld: [{ name: "late page", ageDays: 45 }] });
  expect(network.paths).toContain("/api/v2/projects/copy-project/branches?cursor=page-2");
});

it.each([
  ["the provider refuses", neon({ status: 503 })],
  ["the active branch is not in the project", neon({ branches: [{ ...active, id: "br-other" }] })],
  ["a time is in the future", neon({ snapshots: [scheduled(-1)] })],
])("fails without a verdict when %s", async (_case, network) => {
  expect(await check(network)).toEqual({ ok: false, status: "checker-failed" });
});

it.each([
  [{ NEON_API_KEY: undefined }, [{ setting: "NEON_API_KEY", problem: "missing" }]],
  [{ NEON_API_KEY: "key with spaces" }, [{ setting: "NEON_API_KEY", problem: "refused" }]],
  [{ BACKUP_PROJECT_ID: "" }, [{ setting: "BACKUP_PROJECT_ID", problem: "missing" }]],
  [{ BACKUP_PROJECT_ID: "copy/../other-project", BACKUP_BRANCH_ID: "main-branch" }, [
    { setting: "BACKUP_PROJECT_ID", problem: "refused" },
    { setting: "BACKUP_BRANCH_ID", problem: "refused" },
  ]],
])("names each missing or refused setting, without its value, before calling Neon: %o", async (changed, settings) => {
  const network = neon({});
  const result = await check(network, { ...env, ...changed });
  expect(result).toEqual({ ok: false, status: "configuration-failed", settings });
  expect(network.paths).toEqual([]);
  for (const value of Object.values(changed)) if (value) expect(JSON.stringify(result)).not.toContain(value);
});
