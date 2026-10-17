import { createHash } from "node:crypto";
import { z } from "zod";

const pingUrlSchema = z.string().regex(/^https:\/\/hc-ping\.com\/[a-f0-9-]{36}$/);

const configSchema = z.object({
  BACKUP_PROJECT_ID: z.string().regex(/^[a-z0-9-]{1,60}$/),
  BACKUP_BRANCH_ID: z.string().regex(/^br-[a-z0-9-]{1,57}$/),
  NEON_API_KEY: z.string().min(1).regex(/^\S+$/),
  HEALTHCHECKS_PING_URL: pingUrlSchema,
});
const snapshotSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  source_branch_id: z.string().regex(/^br-[a-z0-9-]{1,57}$/),
  timestamp: z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  manual: z.boolean(),
});
const pageSchema = z.object({
  snapshots: z.array(snapshotSchema),
  pagination: z.object({ cursor: z.string().min(1).nullable().optional() }).strict().optional(),
});

type Options = {
  env: Readonly<Record<string, string | undefined>>;
  fetcher?: typeof fetch;
  now?: () => Date;
};

export async function runBackupCheck({ env, fetcher = fetch, now = () => new Date() }: Options) {
  const parsed = configSchema.safeParse(env);
  const pingUrl = pingUrlSchema.safeParse(env.HEALTHCHECKS_PING_URL);
  if (!pingUrl.success) return { ok: false, status: "configuration-failed" };
  const expired: { fingerprint: string; ageDays: number; kind: "manual" | "scheduled" }[] = [];
  let outcome: {
    status: "fresh" | "stale" | "no-snapshots" | "retention-overdue";
    newestAgeHours: number | null;
    expired: typeof expired;
  } | { status: "checker-failed" | "configuration-failed" };
  try {
    if (!parsed.success) throw new Error("Invalid configuration");
    const config = parsed.data;
    const snapshots: z.infer<typeof snapshotSchema>[] = [];
    const seenCursors = new Set<string>();
    const seenIds = new Set<string>();
    const deadline = AbortSignal.timeout(60_000);
    let cursor: string | null | undefined;
    do {
      if (seenCursors.size >= 100) throw new Error("Too many pages");
      const url = new URL(`https://console.neon.tech/api/v2/projects/${config.BACKUP_PROJECT_ID}/snapshots`);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetcher(url, {
        headers: { Authorization: `Bearer ${config.NEON_API_KEY}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) throw new Error("Provider failed");
      const page = pageSchema.parse(await response.json());
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
    const checkedAt = now().getTime();
    if (!Number.isFinite(checkedAt)) throw new Error("Invalid clock");
    const matchingAges: number[] = [];
    for (const snapshot of snapshots) {
      const capturedAt = Date.parse(snapshot.timestamp);
      const createdAt = Date.parse(snapshot.created_at);
      if (capturedAt > checkedAt || createdAt > checkedAt) throw new Error("Future snapshot");
      const capturedAge = (checkedAt - capturedAt) / 3_600_000;
      if (snapshot.source_branch_id === config.BACKUP_BRANCH_ID) matchingAges.push(capturedAge);
      const ageDays = (checkedAt - Math.min(capturedAt, createdAt)) / 86_400_000;
      if (ageDays > 30) {
        expired.push({
          fingerprint: createHash("sha256").update(snapshot.id).digest("hex").slice(0, 12),
          ageDays,
          kind: snapshot.manual ? "manual" : "scheduled",
        });
      }
    }
    const newestAgeHours = matchingAges.length ? Math.min(...matchingAges) : null;
    const status = newestAgeHours === null ? "no-snapshots"
      : newestAgeHours > 24 ? "stale"
      : expired.length ? "retention-overdue" : "fresh";
    outcome = { status, newestAgeHours, expired };
  } catch {
    outcome = { status: parsed.success ? "checker-failed" : "configuration-failed" };
  }
  try {
    const response = await fetcher(pingUrl.data + (outcome.status === "fresh" ? "" : "/fail"), {
      method: "POST",
      body: JSON.stringify(outcome),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Alert failed");
  } catch {
    return { ok: false, status: "alert-failed" };
  }
  return { ok: outcome.status === "fresh", ...outcome };
}
