import { z } from "zod";
import { configSchema, oldestDataTime } from "./backupChecker";

const snapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  timestamp: z.iso.datetime({ offset: true }).optional(),
  created_at: z.iso.datetime({ offset: true }),
  manual: z.boolean(),
});
const snapshotPageSchema = z.object({
  snapshots: z.array(snapshotSchema),
  pagination: z.object({ cursor: z.string().min(1).nullable().optional() }).strict().optional(),
}).strict();
const branchSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  parent_timestamp: z.iso.datetime({ offset: true }).optional(),
  restored_from: z.string().min(1).optional(),
});
const branchPageSchema = z.object({
  branches: z.array(branchSchema),
  pagination: z.object({ next: z.string().min(1).optional() }).optional(),
});
const projectSchema = z.object({ project: z.object({ history_retention_seconds: z.number().int().nonnegative() }) });

const DELETION_LIST_DAYS = 30;

type TooOld = { kind: "snapshot" | "branch"; name: string; ageDays: number | "unknown" };
type AgeReport =
  | { ok: true; status: "within-30-days"; tooOld: [] }
  | { ok: false; status: "too-old"; tooOld: TooOld[] }
  | { ok: false; status: "checker-failed" | "configuration-failed" };

export async function runBackupAgeCheck({ env, fetcher = fetch, now = () => new Date() }: {
  env: Readonly<Record<string, string | undefined>>;
  fetcher?: typeof fetch;
  now?: () => Date;
}): Promise<AgeReport> {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) return { ok: false, status: "configuration-failed" };
  const config = parsed.data;
  try {
    const deadline = AbortSignal.timeout(60_000);
    const request = async (path: string, cursor?: string | null) => {
      const url = new URL(`https://console.neon.tech/api/v2/projects/${config.BACKUP_PROJECT_ID}${path}`);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetcher(url, {
        headers: { Authorization: `Bearer ${config.NEON_API_KEY}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) throw new Error("Provider failed");
      return response.json();
    };
    const readAll = async <T>(path: string, readPage: (body: unknown) => { items: T[]; next?: string | null }) => {
      const items: T[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | null | undefined;
      do {
        if (seenCursors.size >= 100) throw new Error("Too many pages");
        const page = readPage(await request(path, cursor));
        items.push(...page.items);
        cursor = page.next;
        if (cursor) {
          if (seenCursors.has(cursor)) throw new Error("Repeated page");
          seenCursors.add(cursor);
        }
      } while (cursor);
      return items;
    };
    const snapshots = await readAll("/snapshots", (body) => {
      const page = snapshotPageSchema.parse(body);
      return { items: page.snapshots, next: page.pagination?.cursor };
    });
    const branches = await readAll("/branches", (body) => {
      const page = branchPageSchema.parse(body);
      return { items: page.branches, next: page.pagination?.next };
    });
    if (!branches.some((branch) => branch.id === config.BACKUP_BRANCH_ID)) throw new Error("Active branch missing");
    const historyMs = snapshots.some((snapshot) => snapshot.manual && snapshot.timestamp === undefined)
      ? projectSchema.parse(await request("")).project.history_retention_seconds * 1000
      : 0;

    const checkedAt = now().getTime();
    if (!Number.isFinite(checkedAt)) throw new Error("Invalid clock");
    const tooOld: TooOld[] = [];
    const check = (kind: TooOld["kind"], name: string, time: number) => {
      if (time > checkedAt) throw new Error("Future time");
      const days = (checkedAt - time) / 86_400_000;
      if (days > DELETION_LIST_DAYS) tooOld.push({ kind, name, ageDays: Math.floor(days * 10) / 10 });
    };
    const snapshotTimes = new Map<string, number>();
    for (const snapshot of snapshots) {
      const time = oldestDataTime(snapshot, historyMs);
      snapshotTimes.set(snapshot.id, time);
      check("snapshot", snapshot.name, time);
    }
    for (const branch of branches) {
      if (branch.id === config.BACKUP_BRANCH_ID) continue;
      const restoredFrom = branch.restored_from === undefined ? undefined : snapshotTimes.get(branch.restored_from);
      if (branch.restored_from !== undefined && restoredFrom === undefined) {
        tooOld.push({ kind: "branch", name: branch.name, ageDays: "unknown" });
        continue;
      }
      const times = [branch.created_at, branch.parent_timestamp].flatMap((time) => (time ? [Date.parse(time)] : []));
      check("branch", branch.name, Math.min(...times, restoredFrom ?? Infinity));
    }
    return tooOld.length ? { ok: false, status: "too-old", tooOld } : { ok: true, status: "within-30-days", tooOld: [] };
  } catch {
    return { ok: false, status: "checker-failed" };
  }
}
