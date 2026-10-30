import { createHash } from "node:crypto";
import { z } from "zod";

const pingUrlSchema = z.string().regex(/^https:\/\/hc-ping\.com\/[a-f0-9-]{36}$/);
export const configSchema = z.object({
  BACKUP_PROJECT_ID: z.string().regex(/^[a-z0-9-]{1,60}$/),
  BACKUP_BRANCH_ID: z.string().regex(/^br-[a-z0-9-]{1,57}$/),
  NEON_API_KEY: z.string().min(1).regex(/^\S+$/),
});
const snapshotSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  source_branch_id: z.string().regex(/^br-[a-z0-9-]{1,57}$/),
  timestamp: z.iso.datetime({ offset: true }).optional(),
  lsn: z.string().optional(),
  created_at: z.iso.datetime({ offset: true }),
  manual: z.boolean(),
}).refine((snapshot) => snapshot.timestamp !== undefined || snapshot.lsn === undefined);
const pageSchema = z.object({
  snapshots: z.array(snapshotSchema),
  pagination: z.object({ cursor: z.string().min(1).nullable().optional() }).strict().optional(),
}).strict();
const projectSchema = z.object({ project: z.object({ history_retention_seconds: z.number().int().nonnegative() }) });

type ExpiredBackup = { fingerprint: string; ageDays: number; kind: "manual" | "scheduled" };
type BackupReport =
  | { ok: true; status: "fresh"; newestAgeHours: number; expired: ExpiredBackup[] }
  | { ok: false; status: "stale" | "retention-overdue"; newestAgeHours: number; expired: ExpiredBackup[] }
  | { ok: false; status: "no-snapshots"; newestAgeHours: null; expired: ExpiredBackup[] }
  | { ok: false; status: "checker-failed" | "configuration-failed" | "alert-failed" };
type Options = {
  env: Readonly<Record<string, string | undefined>>;
  fetcher?: typeof fetch;
  now?: () => Date;
};

export function oldestDataTime(
  snapshot: { timestamp?: string; created_at: string; manual: boolean },
  historyMs: number,
) {
  const createdAt = Date.parse(snapshot.created_at);
  const capturedAt = snapshot.timestamp !== undefined ? Date.parse(snapshot.timestamp) : snapshot.manual ? null : createdAt;
  const earliestPointInHistoryWindow = createdAt - historyMs;
  return Math.min(capturedAt ?? earliestPointInHistoryWindow, createdAt);
}

function assessBackups({ snapshots, branchId, checkedAt, historyMs }: {
  snapshots: z.infer<typeof snapshotSchema>[];
  branchId: string;
  checkedAt: number;
  historyMs: number;
}): BackupReport {
  if (!Number.isFinite(checkedAt)) throw new Error("Invalid clock");
  const expired: ExpiredBackup[] = [];
  const matchingAges: number[] = [];
  for (const snapshot of snapshots) {
    const createdAt = Date.parse(snapshot.created_at);
    const capturedAt = snapshot.timestamp !== undefined ? Date.parse(snapshot.timestamp) : snapshot.manual ? null : createdAt;
    if ((capturedAt ?? createdAt) > checkedAt || createdAt > checkedAt) throw new Error("Future snapshot");
    if (snapshot.source_branch_id === branchId && capturedAt !== null) matchingAges.push((checkedAt - capturedAt) / 3_600_000);
    const ageDays = (checkedAt - oldestDataTime(snapshot, historyMs)) / 86_400_000;
    if (ageDays > 30) {
      expired.push({
        fingerprint: createHash("sha256").update(snapshot.id).digest("hex").slice(0, 12),
        ageDays,
        kind: snapshot.manual ? "manual" : "scheduled",
      });
    }
  }
  if (!matchingAges.length) return { ok: false, status: "no-snapshots", newestAgeHours: null, expired };
  const newestAgeHours = Math.min(...matchingAges);
  return newestAgeHours > 24
    ? { ok: false, status: "stale", newestAgeHours, expired }
    : expired.length
      ? { ok: false, status: "retention-overdue", newestAgeHours, expired }
      : { ok: true, status: "fresh", newestAgeHours, expired };
}

export async function runBackupCheck({ env, fetcher = fetch, now = () => new Date() }: Options): Promise<BackupReport> {
  const parsed = configSchema.safeParse(env);
  const pingUrl = pingUrlSchema.safeParse(env.HEALTHCHECKS_PING_URL);
  const retentionUrl = pingUrlSchema.safeParse(env.HEALTHCHECKS_RETENTION_PING_URL);
  const configured = parsed.success && pingUrl.success && retentionUrl.success && pingUrl.data !== retentionUrl.data;
  let outcome: BackupReport;
  try {
    if (!parsed.success || !configured) throw new Error("Invalid configuration");
    const config = parsed.data;
    const snapshots: z.infer<typeof snapshotSchema>[] = [];
    const seenCursors = new Set<string>();
    const seenIds = new Set<string>();
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
    let cursor: string | null | undefined;
    do {
      if (seenCursors.size >= 100) throw new Error("Too many pages");
      const page = pageSchema.parse(await request("/snapshots", cursor));
      for (const snapshot of page.snapshots) {
        if (seenIds.has(snapshot.id)) throw new Error("Repeated snapshot");
        seenIds.add(snapshot.id);
        snapshots.push(snapshot);
      }
      cursor = page.pagination?.cursor;
      if (cursor) {
        if (seenCursors.has(cursor)) throw new Error("Repeated page");
        seenCursors.add(cursor);
      }
    } while (cursor);
    const historyMs = snapshots.some((snapshot) => snapshot.manual && snapshot.timestamp === undefined)
      ? projectSchema.parse(await request("")).project.history_retention_seconds * 1000
      : 0;
    outcome = assessBackups({ snapshots, branchId: config.BACKUP_BRANCH_ID, checkedAt: now().getTime(), historyMs });
  } catch {
    outcome = { ok: false, status: configured ? "checker-failed" : "configuration-failed" };
  }
  if (retentionUrl.success) {
    try {
      await sendReport({
        fetcher, url: retentionUrl.data, outcome,
        failed: !("expired" in outcome) || outcome.expired.length > 0,
      });
    } catch {
      outcome = { ok: false, status: "alert-failed" };
    }
  }
  if (pingUrl.success) {
    try {
      await sendReport({
        fetcher, url: pingUrl.data, outcome,
        failed: outcome.status !== "fresh" && outcome.status !== "retention-overdue",
      });
    } catch {
      return { ok: false, status: "alert-failed" };
    }
  }
  return outcome;
}

async function sendReport({ fetcher, url, outcome, failed }: {
  fetcher: typeof fetch;
  url: string;
  outcome: BackupReport;
  failed: boolean;
}) {
  const response = await fetcher(url + (failed ? "/fail" : ""), {
    method: "POST",
    body: JSON.stringify(outcome),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Alert failed");
}
