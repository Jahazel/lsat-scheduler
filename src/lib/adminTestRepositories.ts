import { and, eq, sql } from "drizzle-orm";
import { getPostgresDatabase } from "./postgres";
import { accounts, analyticsSnapshots, practiceTestResults, students } from "./postgresSchema";
import { findStudentByAccountId } from "./studentRepository";
import { listApprovedAnalyticsSnapshots } from "./analyticsSnapshotRepository";
import { postgresAdminClock } from "./studentClock";
import type { AdminTestRepositories } from "./adminTestWorkspace";

export const postgresAdminTestRepositories: AdminTestRepositories = {
  clock: postgresAdminClock,
  findStudent: findStudentByAccountId,
  approvedSnapshots: listApprovedAnalyticsSnapshots,
  async inTransaction(work) {
    await getPostgresDatabase().transaction(async (transaction) => {
      await work({
        async deleteSchedules(studentId, weekStartDate) {
          const result = await transaction.execute(sql`
            delete from weekly_schedules where student_id = ${studentId}::uuid
            ${weekStartDate ? sql`and week_start_date = ${weekStartDate}::date` : sql``}
            returning id
          `);
          return result.rows.length;
        },
        async deleteSnapshots(studentId) {
          await transaction.delete(analyticsSnapshots).where(eq(analyticsSnapshots.studentId, studentId));
        },
        async deletePracticeTestResults(studentId) {
          await transaction.delete(practiceTestResults).where(eq(practiceTestResults.studentId, studentId));
        },
        async deleteStudent(studentId, userId) {
          await transaction.delete(students).where(and(eq(students.id, studentId), eq(students.accountId, userId)));
        },
        async clearSimulatedDate(userId) {
          await transaction.update(accounts).set({ simulatedDate: null })
            .where(and(eq(accounts.id, userId), eq(accounts.role, "admin")));
        },
      });
    });
  },
};
