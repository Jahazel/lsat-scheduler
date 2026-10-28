import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { getPostgresDatabase } from "../../src/lib/postgres";
import { createStudent } from "../../src/lib/studentRepository";
import { practiceTestResults } from "../../src/lib/postgresSchema";
import { PT158_FIXTURES } from "../../src/lib/practiceTestFixtures/pt158";
import { reviewPracticeTest } from "../../src/lib/practiceTestResult";
import type { Student } from "../../src/lib/types";

const database = setUpAppTestDatabase();
beforeEach(async () => {
  await database.owner.execute(sql`truncate accounts cascade`);
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

async function student() {
  const account = await database.createAccountAsOwner({ email: `${randomUUID()}@example.test`, name: "Student", role: "student" });
  if (!account) throw new Error("Account fixture already exists");
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  return { accountId: account.id, studentId: saved.id };
}

function pt158() {
  const review = reviewPracticeTest(PT158_FIXTURES.map(({ reading }) => reading));
  if (!review.ok) throw new Error("PrepTest 158 fixtures did not produce a result");
  return review.result;
}

function row(studentId: string) {
  const { prepTest, sections, hiddenResults, missedStemTypeCounts } = pt158();
  return {
    studentId, weekOf: "2026-10-19", prepTest, sections, hiddenResults, missedStemTypeCounts,
    approvedAt: new Date("2026-10-17T12:05:00Z"), extractionSource: "7sage_screenshot" as const,
    extractedAt: new Date("2026-10-17T12:00:00Z"), extractedValuesMatch: true, isThisWeeksPracticeTest: true,
    confirmedAt: new Date("2026-10-17T12:05:00Z"),
  };
}

it("saves a Practice-test result as the app role and reads it back unchanged", async () => {
  const { studentId } = await student();
  const [{ id }] = await getPostgresDatabase().insert(practiceTestResults).values(row(studentId)).returning();
  const [saved] = await getPostgresDatabase().select().from(practiceTestResults).where(eq(practiceTestResults.id, id));
  expect(saved).toMatchObject(row(studentId));
  expect(saved.sections.map(({ section }) => section)).toEqual([1, 2, 3, 4]);
  expect(saved.missedStemTypeCounts["Flaw or descriptive weakening"]).toBe(2);
});

it("defaults the settled hidden rows to none", async () => {
  const { studentId } = await student();
  const [saved] = await getPostgresDatabase().insert(practiceTestResults).values({ ...row(studentId), hiddenResults: undefined }).returning();
  expect(saved.hiddenResults).toEqual([]);
});

it.each([
  ["a PrepTest number of 0", { prepTest: 0 }],
  ["three sections", { sections: pt158().sections.slice(0, 3) }],
  ["sections that are not a list", { sections: {} }],
  ["hidden rows that are not a list", { hiddenResults: {} }],
  ["missed counts that are not an object", { missedStemTypeCounts: [] }],
  ["an unknown extraction source", { extractionSource: "guess" }],
  ["unconfirmed values", { extractedValuesMatch: false }],
  ["an unconfirmed practice test", { isThisWeeksPracticeTest: false }],
])("refuses %s", async (_case, change) => {
  const { studentId } = await student();
  await expect(getPostgresDatabase().insert(practiceTestResults).values({ ...row(studentId), ...change } as ReturnType<typeof row>))
    .rejects.toMatchObject({ cause: { code: "23514" } });
});

it("refuses a Practice-test result for a missing student", async () => {
  await expect(getPostgresDatabase().insert(practiceTestResults).values(row(randomUUID())))
    .rejects.toMatchObject({ cause: { code: "23503" } });
});

it("deletes a student's Practice-test results with the Account and keeps other students' results", async () => {
  const deleted = await student();
  const kept = await student();
  await getPostgresDatabase().insert(practiceTestResults).values([row(deleted.studentId), row(kept.studentId)]);
  await getPostgresDatabase().execute(sql`delete from accounts where id = ${deleted.accountId}`);
  expect((await getPostgresDatabase().select({ studentId: practiceTestResults.studentId }).from(practiceTestResults)))
    .toEqual([{ studentId: kept.studentId }]);
});

it("advances updated_at on each change", async () => {
  const { studentId } = await student();
  const [{ id }] = await getPostgresDatabase().insert(practiceTestResults).values(row(studentId)).returning();
  const before = await database.owner.execute(sql`select updated_at from practice_test_results where id = ${id}`);
  await getPostgresDatabase().update(practiceTestResults).set({ prepTest: 157 }).where(eq(practiceTestResults.id, id));
  expect((await database.owner.execute(sql`
    select updated_at > ${before.rows[0].updated_at}::timestamptz as advanced from practice_test_results where id = ${id}
  `)).rows).toEqual([{ advanced: true }]);
});
