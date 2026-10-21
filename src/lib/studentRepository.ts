import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { approvedSnapshotColumns } from "./analyticsSnapshotRepository";
import type { prepareApprovedSnapshot } from "./analyticsSnapshots";
import { isAccountId } from "./accountRepository";
import { getPostgresDatabase } from "./postgres";
import { accounts, analyticsSnapshots, students } from "./postgresSchema";
import type { OfficialAttempt } from "./studentProfile";
import type { Student, StudentRecord } from "./types";

export type PersistedStudent = Student & { id: string };

function studentColumns(student: Student) {
  return {
    platform: "7Sage" as const,
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

function studentRecord(row: { student: typeof students.$inferSelect; name: string; email: string }): StudentRecord {
  return { ...persistedStudent(row.student), userId: row.student.accountId, name: row.name, email: row.email };
}

function selectStudentsWithOwners() {
  return getPostgresDatabase()
    .select({ student: students, name: accounts.name, email: accounts.email })
    .from(students)
    .innerJoin(accounts, eq(accounts.id, students.accountId));
}

/** Admin-only. Excludes Admin-owned students. */
export async function listStudentsWithOwners() {
  const rows = await selectStudentsWithOwners().where(ne(accounts.role, "admin"));
  // Sorted here so the order does not depend on the database's collation.
  return rows.map(studentRecord).sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin-only. Returns null for an invalid ID, a missing student, or an Admin-owned student. */
export async function findStudentWithOwner(id: string) {
  if (!z.guid().safeParse(id).success) return null;
  const [row] = await selectStudentsWithOwners().where(and(eq(students.id, id), ne(accounts.role, "admin")));
  return row ? studentRecord(row) : null;
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
  {
    snapshot = null,
    officialAttempts = [],
  }: { snapshot?: ReturnType<typeof prepareApprovedSnapshot> | null; officialAttempts?: OfficialAttempt[] } = {},
) {
  if (!isAccountId(accountId)) return null;
  return getPostgresDatabase().transaction(async (transaction) => {
    const [row] = await transaction
      .insert(students)
      .values({ accountId, ...studentColumns(student), officialAttempts })
      .onConflictDoNothing({ target: students.accountId })
      .returning();
    if (!row) return null;
    if (snapshot) {
      await transaction.insert(analyticsSnapshots).values(approvedSnapshotColumns(row.id, snapshot));
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
