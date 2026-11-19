import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { expectUnexpectedFailure, planned } from "./plannedAnswer";
import type { Student } from "../../src/lib/types";
import { SEEDED_TEST_MONTHS } from "../../src/lib/testMonthsFixture";

const request = vi.hoisted(() => ({ session: null as Session | null }));
vi.mock("@/auth", () => ({ auth: async () => request.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

import { addTestMonthFromForm, removeTestMonthFromForm } from "../../src/app/admin/test-dates/actions";
import { createStudentProfile } from "../../src/app/onboarding/actions";
import OnboardingPage from "../../src/app/onboarding/page";
import { saveStudySettings } from "../../src/app/settings/actions";
import StudySettingsPage from "../../src/app/settings/page";
import { createStudent, findStudentByAccountId } from "../../src/lib/studentRepository";
import { listTestMonths, listTestMonthsWithStudents } from "../../src/lib/testMonthRepository";

const database = setUpAppTestDatabase();

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 105, WEDNESDAY: 120, THURSDAY: 135, FRIDAY: 150, SATURDAY: 165, SUNDAY: 180 },
};
const onboarding = { ...profile, officialAttempts: [], analyticsRows: [], analyticsApproval: null };

async function signIn(email: string, role: "student" | "admin" = "student") {
  const created = await database.createAccountAsOwner({ email, name: email, role });
  if (!created) throw new Error("Fixture Account already exists.");
  request.session = { user: { id: created.id, role, email, name: email }, expires: "2099-01-01T00:00:00.000Z" };
  return created;
}

async function onboardedStudent(email: string, goalTestDate = profile.goalTestDate) {
  const created = await signIn(email);
  await expect(createStudentProfile({ ...onboarding, goalTestDate })).resolves.toBeUndefined();
  await database.writeBillingRecordAsOwner(created.id);
  return created;
}

function monthForm(month: number, year: number) {
  const form = new FormData();
  form.set("month", String(month));
  form.set("year", String(year));
  return form;
}

function removeForm(month: string) {
  const form = new FormData();
  form.set("month", month);
  return form;
}

const offeredMonths = (page: string) => [...page.matchAll(/<option value="(\d{4}-\d{2}-01)"[^>]*>/g)].map((match) => match[1]);

beforeEach(async () => {
  request.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));
  await database.owner.execute(sql`truncate accounts, security_log cascade`);
  await database.owner.execute(sql`delete from test_months`);
  await database.owner.execute(sql`
    insert into test_months (month) select unnest(${`{${SEEDED_TEST_MONTHS.join(",")}}`}::date[])
  `);
});
afterEach(() => vi.useRealTimers());

describe("the test-month list after the migration", () => {
  it("holds the six months that were in code, oldest first", async () => {
    await database.owner.execute(sql`delete from test_months`);
    const [, seed] = readFileSync("migrations/0027_test_months.sql", "utf8").split("--> statement-breakpoint");
    await database.owner.execute(sql.raw(seed!));
    expect(await listTestMonths()).toEqual([...SEEDED_TEST_MONTHS]);
  });

  it("gives onboarding and Study settings the same months as before", async () => {
    await signIn("new@example.test");
    const expected = ["2026-11-01", "2027-01-01", "2027-02-01", "2027-04-01", "2027-06-01"];
    expect(offeredMonths(renderToStaticMarkup(await OnboardingPage({ searchParams: Promise.resolve({}) })))).toEqual(expected);
    await onboardedStudent("settings@example.test");
    expect(offeredMonths(renderToStaticMarkup(await StudySettingsPage()))).toEqual(expected);
  });

  it("refuses a test month that is not the first of its month", async () => {
    await expect(database.owner.execute(sql`insert into test_months (month) values ('2027-08-02')`))
      .rejects.toMatchObject({ cause: { code: "23514" } });
  });
});

describe("an Admin keeping the list", () => {
  it("adds a month, and a student whose date is before it can pick it at once in onboarding and Study settings", async () => {
    vi.setSystemTime(new Date("2027-07-01T15:00:00Z"));
    const student = await signIn("student@example.test");
    await createStudent(student.id, profile);
    await database.writeBillingRecordAsOwner(student.id);
    const studentSession = request.session;
    await signIn("newcomer@example.test");
    const newcomerSession = request.session;
    expect(offeredMonths(renderToStaticMarkup(await OnboardingPage({ searchParams: Promise.resolve({}) })))).toEqual([]);

    await signIn("admin@example.test", "admin");
    expect(planned(await addTestMonthFromForm(null, monthForm(8, 2027)))).toEqual({ added: "2027-08-01" });

    request.session = newcomerSession;
    expect(offeredMonths(renderToStaticMarkup(await OnboardingPage({ searchParams: Promise.resolve({}) })))).toEqual(["2027-08-01"]);
    request.session = studentSession;
    expect(offeredMonths(renderToStaticMarkup(await StudySettingsPage()))).toEqual(["2027-08-01"]);
    expect(await saveStudySettings({
      goalScore: 165, goalTestDate: "2027-08-01", preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
      dailyCapacityMinutes: profile.dailyCapacityMinutes, officialAttempts: [],
    })).toBeNull();
    expect(await findStudentByAccountId(student.id)).toMatchObject({ goalTestDate: "2027-08-01" });
  });

  it("says a month is already on the list instead of adding it twice", async () => {
    await signIn("admin@example.test", "admin");
    expect(planned(await addTestMonthFromForm(null, monthForm(6, 2027)))).toEqual({ listed: "2027-06-01" });
    expect(await listTestMonths()).toEqual([...SEEDED_TEST_MONTHS]);
  });

  it("refuses an add that is not a month and year", async () => {
    await signIn("admin@example.test", "admin");
    expect(planned(await addTestMonthFromForm(null, monthForm(13, 2027)))).toEqual({ invalid: true });
    expect(await listTestMonths()).toEqual([...SEEDED_TEST_MONTHS]);
  });

  it("refuses removing a month students picked, with their count, and removes a month nobody picked", async () => {
    await onboardedStudent("one@example.test");
    await onboardedStudent("two@example.test");
    expect((await listTestMonthsWithStudents()).find((row) => row.month === "2027-06-01")).toEqual({ month: "2027-06-01", students: 2 });

    await signIn("admin@example.test", "admin");
    expect(planned(await removeTestMonthFromForm(null, removeForm("2027-06-01")))).toEqual({ picked: 2 });
    expect(await listTestMonths()).toContain("2027-06-01");

    expect(planned(await removeTestMonthFromForm(null, removeForm("2027-04-01")))).toBeNull();
    expect(await listTestMonths()).not.toContain("2027-04-01");
    await signIn("late@example.test");
    expect(offeredMonths(renderToStaticMarkup(await OnboardingPage({ searchParams: Promise.resolve({}) })))).not.toContain("2027-04-01");
  });

  it.each([
    ["a standard student", "student" as const],
    ["a signed-out visitor", null],
  ])("refuses %s adding or removing a month, and logs it", async (_who, role) => {
    if (role) await signIn("student@example.test", role);
    await expectUnexpectedFailure(database, addTestMonthFromForm(null, monthForm(8, 2027)), "AdminAccessRequired");
    await expectUnexpectedFailure(database, removeTestMonthFromForm(null, removeForm("2027-04-01")), "AdminAccessRequired");
    expect(await listTestMonths()).toEqual([...SEEDED_TEST_MONTHS]);
    const refused = await database.owner.execute(sql`select route from security_log where event = 'admin_action_refused'`);
    expect(refused.rows).toEqual([{ route: "/admin/test-dates" }, { route: "/admin/test-dates" }]);
  });
});
