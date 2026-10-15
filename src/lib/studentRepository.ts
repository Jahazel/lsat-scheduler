import { eq, sql } from "drizzle-orm";
import type { prepareApprovedSnapshot } from "./analyticsSnapshots";
import { isAccountId } from "./accountRepository";
import { getPostgresDatabase } from "./postgres";
import { students } from "./postgresSchema";
import type { Student } from "./types";

export type PersistedStudent = Student & { id: string };

function studentColumns(student: Student) {
  return {
    platform: student.platform,
    currentScore: student.currentScore,
    goalScore: student.goalScore,
    goalTestDate: student.goalTestDate,
    preferredPracticeTestDay: student.preferredPracticeTestDay,
    accommodation: student.accommodationMultiplier,
    mondayCapacityMinutes: student.dailyCapacityMinutes.MONDAY,
    tuesdayCapacityMinutes: student.dailyCapacityMinutes.TUESDAY,
    wednesdayCapacityMinutes: student.dailyCapacityMinutes.WEDNESDAY,
    thursdayCapacityMinutes: student.dailyCapacityMinutes.THURSDAY,
    fridayCapacityMinutes: student.dailyCapacityMinutes.FRIDAY,
    saturdayCapacityMinutes: student.dailyCapacityMinutes.SATURDAY,
    sundayCapacityMinutes: student.dailyCapacityMinutes.SUNDAY,
  };
}

function persistedStudent(row: typeof students.$inferSelect): PersistedStudent {
  return {
    id: row.id,
    platform: row.platform,
    currentScore: row.currentScore,
    goalScore: row.goalScore,
    goalTestDate: row.goalTestDate,
    preferredPracticeTestDay: row.preferredPracticeTestDay,
    accommodationMultiplier: row.accommodation,
    dailyCapacityMinutes: {
      MONDAY: row.mondayCapacityMinutes,
      TUESDAY: row.tuesdayCapacityMinutes,
      WEDNESDAY: row.wednesdayCapacityMinutes,
      THURSDAY: row.thursdayCapacityMinutes,
      FRIDAY: row.fridayCapacityMinutes,
      SATURDAY: row.saturdayCapacityMinutes,
      SUNDAY: row.sundayCapacityMinutes,
    },
  };
}

export async function findStudentByAccountId(accountId: string | undefined) {
  if (!isAccountId(accountId)) return null;
  const [row] = await getPostgresDatabase().select().from(students).where(eq(students.accountId, accountId));
  return row ? persistedStudent(row) : null;
}

/** Returns null for an invalid Account ID or an existing student. */
export async function createStudent(
  accountId: string | undefined,
  student: Student,
  snapshot: ReturnType<typeof prepareApprovedSnapshot> | null = null,
) {
  if (!isAccountId(accountId)) return null;
  return getPostgresDatabase().transaction(async (transaction) => {
    const [row] = await transaction
      .insert(students)
      .values({ accountId, ...studentColumns(student) })
      .onConflictDoNothing({ target: students.accountId })
      .returning();
    if (!row) return null;
    if (snapshot) {
      await transaction.execute(sql`
        insert into analytics_snapshots (
          student_id, week_of, lr_accuracy_by_type, lr_top_priority_logic_types,
          approved_at, extraction_source, extracted_at, extracted_values_match,
          is_latest_analytics, confirmed_at
        ) values (
          ${row.id}::uuid, ${snapshot.weekOf}::date,
          ${JSON.stringify(snapshot.lrAccuracyByType)}::jsonb,
          ${sql.param(snapshot.lrTopPriorityLogicTypes)}::text[],
          ${snapshot.approvedAt.toISOString()}::timestamptz,
          ${snapshot.extraction.source},
          ${snapshot.extraction.extractedAt.toISOString()}::timestamptz,
          ${snapshot.confirmation.extractedValuesMatch},
          ${snapshot.confirmation.isLatestAnalytics},
          ${snapshot.confirmation.confirmedAt.toISOString()}::timestamptz
        )
      `);
    }
    return persistedStudent(row);
  });
}

export async function updateStudentByAccountId(accountId: string | undefined, student: Student) {
  if (!isAccountId(accountId)) return false;
  const updated = await getPostgresDatabase()
    .update(students)
    .set(studentColumns(student))
    .where(eq(students.accountId, accountId))
    .returning({ id: students.id });
  return updated.length === 1;
}
