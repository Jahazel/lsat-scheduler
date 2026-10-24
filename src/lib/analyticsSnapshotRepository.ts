import { asc, desc, eq } from "drizzle-orm";
import { countAction } from "./actionLimits";
import { SnapshotSaveLimitReached, type prepareApprovedSnapshot } from "./analyticsSnapshots";
import { getPostgresDatabase, type PostgresTransaction } from "./postgres";
import { analyticsSnapshots } from "./postgresSchema";

type ApprovedSnapshotInput = ReturnType<typeof prepareApprovedSnapshot>;

export function approvedSnapshotColumns(studentId: string, snapshot: ApprovedSnapshotInput) {
  return {
    studentId,
    weekOf: snapshot.weekOf,
    lrAccuracyByType: snapshot.lrAccuracyByType,
    lrTopPriorityLogicTypes: snapshot.lrTopPriorityLogicTypes,
    rcAccuracyByType: snapshot.rcAccuracyByType,
    approvedAt: snapshot.approvedAt,
    extractionSource: snapshot.extraction.source,
    extractedAt: snapshot.extraction.extractedAt,
    extractedValuesMatch: snapshot.confirmation.extractedValuesMatch,
    isLatestAnalytics: snapshot.confirmation.isLatestAnalytics,
    confirmedAt: snapshot.confirmation.confirmedAt,
  } satisfies typeof analyticsSnapshots.$inferInsert;
}

export type SnapshotSaver = { accountId: string; realNow: Date };

export async function countSnapshotSave(transaction: PostgresTransaction, saver: SnapshotSaver) {
  if (!(await countAction("analyticsSnapshotSave", saver.accountId, saver.realNow, transaction)).allowed) {
    throw new SnapshotSaveLimitReached();
  }
}

export async function createApprovedAnalyticsSnapshot(studentId: string, snapshot: ApprovedSnapshotInput) {
  await getPostgresDatabase().insert(analyticsSnapshots).values(approvedSnapshotColumns(studentId, snapshot));
}

export async function listApprovedAnalyticsSnapshots(studentId: string) {
  const records = await getPostgresDatabase().select().from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.studentId, studentId))
    .orderBy(desc(analyticsSnapshots.approvedAt), asc(analyticsSnapshots.id));
  return records.map((record) => ({
    id: record.id,
    studentId: record.studentId,
    status: "approved" as const,
    weekOf: record.weekOf,
    lrAccuracyByType: record.lrAccuracyByType,
    lrTopPriorityLogicTypes: record.lrTopPriorityLogicTypes,
    ...(record.rcAccuracyByType && { rcAccuracyByType: record.rcAccuracyByType }),
    approvedAt: record.approvedAt.toISOString(),
    extraction: { source: record.extractionSource, extractedAt: record.extractedAt.toISOString() },
    confirmation: {
      extractedValuesMatch: record.extractedValuesMatch,
      isLatestAnalytics: record.isLatestAnalytics,
      confirmedAt: record.confirmedAt.toISOString(),
    },
  }));
}

export async function listStudentIdsWithApprovedAnalytics() {
  const records = await getPostgresDatabase().selectDistinct({ studentId: analyticsSnapshots.studentId }).from(analyticsSnapshots);
  return records.map((record) => record.studentId);
}
