import { asc, desc, eq } from "drizzle-orm";
import { approvedSnapshotColumns, countSnapshotSave, type SnapshotSaver } from "./analyticsSnapshotRepository";
import { getPostgresDatabase } from "./postgres";
import { analyticsSnapshots, practiceTestResults, students } from "./postgresSchema";
import type { ApprovedPracticeTestResult } from "./practiceTestResult";
import type { PreparedWeeklyUpload } from "./weeklyUploadApproval";

export async function approveWeeklyUpload(studentId: string, upload: PreparedWeeklyUpload, saver: SnapshotSaver) {
  await getPostgresDatabase().transaction(async (transaction) => {
    await countSnapshotSave(transaction, saver);
    await transaction.insert(analyticsSnapshots).values(approvedSnapshotColumns(studentId, upload.snapshot));
    if (upload.practiceTest) {
      await transaction.insert(practiceTestResults).values({ studentId, ...upload.practiceTest });
    }
    const updated = await transaction.update(students).set({ currentScore: upload.currentScore })
      .where(eq(students.id, studentId)).returning({ id: students.id });
    if (updated.length !== 1) throw new Error("Student record not found");
  });
}

export async function listApprovedPracticeTestResults(studentId: string): Promise<ApprovedPracticeTestResult[]> {
  const records = await getPostgresDatabase()
    .select({
      id: practiceTestResults.id,
      approvedAt: practiceTestResults.approvedAt,
      prepTest: practiceTestResults.prepTest,
      missedStemTypeCounts: practiceTestResults.missedStemTypeCounts,
    })
    .from(practiceTestResults)
    .where(eq(practiceTestResults.studentId, studentId))
    .orderBy(desc(practiceTestResults.approvedAt), asc(practiceTestResults.id));
  return records.map((record) => ({ ...record, approvedAt: record.approvedAt.toISOString() }));
}
