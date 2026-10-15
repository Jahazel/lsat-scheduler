import { asc, desc, eq } from "drizzle-orm";
import type { prepareApprovedSnapshot } from "./analyticsSnapshots";
import { getPostgresDatabase } from "./postgres";
import { analyticsSnapshots } from "./postgresSchema";

type ApprovedSnapshotInput = ReturnType<typeof prepareApprovedSnapshot>;

export function approvedSnapshotColumns(studentId: string, snapshot: ApprovedSnapshotInput) {
  return {
    studentId,
    weekOf: snapshot.weekOf,
    lrAccuracyByType: snapshot.lrAccuracyByType,
    lrTopPriorityLogicTypes: snapshot.lrTopPriorityLogicTypes,
    approvedAt: snapshot.approvedAt,
    extractionSource: snapshot.extraction.source,
    extractedAt: snapshot.extraction.extractedAt,
    extractedValuesMatch: snapshot.confirmation.extractedValuesMatch,
    isLatestAnalytics: snapshot.confirmation.isLatestAnalytics,
    confirmedAt: snapshot.confirmation.confirmedAt,
  } satisfies typeof analyticsSnapshots.$inferInsert;
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
