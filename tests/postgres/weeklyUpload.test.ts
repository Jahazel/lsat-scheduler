import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { createStudent, findStudentByAccountId } from "../../src/lib/studentRepository";
import { createApprovedAnalyticsSnapshot, listApprovedAnalyticsSnapshots } from "../../src/lib/analyticsSnapshotRepository";
import { listWeeklySchedulesForStudent } from "../../src/lib/weeklyScheduleRepository";
import { postgresActivityCheckIns } from "../../src/lib/activityCheckInRepository";
import { approveWeeklyUpload, listApprovedPracticeTestResults } from "../../src/lib/weeklyUploadRepository";
import { prepareWeeklyUpload } from "../../src/lib/weeklyUpload";
import { loadStudentNavState } from "../../src/lib/studentNav";
import { PT158_FIXTURES } from "../../src/lib/practiceTestFixtures/pt158";
import { DAY_ORDER } from "../../src/lib/engine";
import { postgresAdminTestRepositories } from "../../src/lib/adminTestRepositories";
import { resetTestWorkspace } from "../../src/lib/adminTestWorkspace";
import { confirmWeeklyUpload } from "../../src/app/dashboard/upload/actions";
import { saveActivityCheckIn } from "../../src/app/dashboard/actions";
import { expectUnexpectedFailure } from "./plannedAnswer";
import DashboardPage from "../../src/app/dashboard/(this-week)/page";
import WeeklyUploadPage from "../../src/app/dashboard/upload/page";
import ProgressPage from "../../src/app/progress/page";
import type { Student } from "../../src/lib/types";

const state = vi.hoisted((): { session: Session | null } => ({ session: null }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => import("./fakeNavigation"));

const database = setUpAppTestDatabase();
beforeEach(async () => {
  state.session = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  await database.owner.execute(sql`truncate accounts cascade`);
  await database.owner.execute(sql`truncate scan_spending`);
  await database.owner.execute(sql`update scan_settings set scanning_off = false, monthly_limit_usd = 10`);
});
afterAll(() => {
  vi.useRealTimers();
});

const MONDAY = new Date("2026-10-12T16:00:00Z");
const SATURDAY = new Date("2026-10-17T17:00:00Z");
const NEXT_MONDAY = new Date("2026-10-19T16:00:00Z");
const RC = { Law: 58, Comparative: 70, Science: 64, Humanities: 81, Art: 77 };

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
};

const progress = async () => renderToStaticMarkup(await ProgressPage({ searchParams: Promise.resolve({}) }));
const dashboard = async () => renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
const uploadPage = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await WeeklyUploadPage({ searchParams: Promise.resolve(searchParams) }));

type Billing = Parameters<typeof database.writeBillingRecordAsOwner>[1] | null;

async function studentWithThisWeek(role: "student" | "admin" = "student", billing: Billing = {}) {
  vi.setSystemTime(MONDAY);
  const account = await database.createAccountAsOwner({ email: `${role}@example.test`, name: "Sam", role });
  if (!account) throw new Error("Account fixture already exists");
  if (role === "student") await database.writeBillingRecordAsOwner(account.id);
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  await createApprovedAnalyticsSnapshot(saved.id, {
    status: "approved", weekOf: "2026-10-12", lrAccuracyByType: { Strengthen: 0.7 }, lrTopPriorityLogicTypes: [],
    rcAccuracyByType: { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 },
    approvedAt: MONDAY, extraction: { source: "7sage_screenshot", extractedAt: MONDAY },
    confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt: MONDAY },
  });
  state.session = { user: { id: account.id, role, email: `${role}@example.test`, name: "Sam" }, expires: "2099-01-01" };
  await dashboard();
  if (role === "student") {
    await database.owner.execute(sql`delete from billing_records where account_id = ${account.id}`);
    if (billing) await database.writeBillingRecordAsOwner(account.id, billing);
  }
  return { accountId: account.id, studentId: saved.id };
}

function upload(at: Date, { currentScore = 160, source = "7sage_screenshot", weekOf = "2026-10-19" } = {}) {
  const extractedAt = new Date(at.getTime() - 5 * 60_000).toISOString();
  const confirmedAt = new Date(at.getTime() - 60_000).toISOString();
  return {
    weekOf,
    currentScore,
    analytics: {
      rows: [
        { type: "Flaw or descriptive weakening", category: "regular", accuracy: 74 },
        { type: "Weaken", category: "regular", accuracy: 70 },
        { type: "Necessary assumption", category: "regular", accuracy: 76 },
        { type: "Phenomenon-hypothesis (LR)", category: "restricted", isTopPriority: true },
        ...Object.entries(RC).map(([type, accuracy]) => ({ type, category: "passage", accuracy })),
      ],
      extraction: { source, extractedAt },
      confirmation: { extractedValuesMatch: true, isLatestAnalytics: true, confirmedAt },
    },
    practiceTest: {
      readings: PT158_FIXTURES.map(({ reading }) => reading),
      picks: [],
      extraction: { source, extractedAt },
      confirmation: { extractedValuesMatch: true, isThisWeeksPracticeTest: true, confirmedAt },
    },
  };
}

async function saved(studentId: string, accountId: string) {
  return {
    snapshots: await listApprovedAnalyticsSnapshots(studentId),
    practiceTests: await listApprovedPracticeTestResults(studentId),
    score: (await findStudentByAccountId(accountId))?.currentScore,
  };
}

it("a Saturday confirmation saves the snapshot, the practice-test result, and the score, then opens This week without the reminder", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  expect(await dashboard()).toContain("Plan next week");

  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");

  const after = await saved(studentId, accountId);
  expect(after.snapshots).toHaveLength(2);
  expect(after.practiceTests).toEqual([expect.objectContaining({
    prepTest: 158, approvedAt: SATURDAY.toISOString(), missedStemTypeCounts: expect.objectContaining({ "Flaw or descriptive weakening": 2 }),
  })]);
  expect(after.score).toBe(160);
  const thisWeek = await dashboard();
  expect(thisWeek).toContain("Your plan for this week");
  expect(thisWeek).not.toContain("Plan next week");
  expect(await listWeeklySchedulesForStudent(studentId)).toHaveLength(1);
});

const FREE_WEEK_ENDS = new Date("2026-10-19T05:00:00Z");
const inFreeWeek = { stripeStatus: "trialing", freeWeekEndsAt: FREE_WEEK_ENDS, paidPeriodEndsAt: FREE_WEEK_ENDS, firstChargeSucceeded: false } as const;
const PLAN_REFUSAL = { error: "Pick a plan to get new weekly schedules." };

it.each([
  ["lapsed after a failed first charge", { ...inFreeWeek, stripeStatus: "past_due", freeWeekEndsAt: new Date("2026-10-12T05:00:00Z") }],
  ["lapsed after cancelling", { stripeStatus: "canceled", paidPeriodEndsAt: new Date("2026-10-17T05:00:00Z") }],
  ["with no plan", null],
] as const)("refuses the confirmation from a student %s with the plan refusal, saving nothing", async (_name, billing) => {
  const { studentId, accountId } = await studentWithThisWeek("student", billing);
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(SATURDAY))).resolves.toEqual(PLAN_REFUSAL);

  expect(await saved(studentId, accountId)).toEqual(before);
});

it.each([
  ["in the free week", inFreeWeek],
  ["retrying a failed renewal", { stripeStatus: "past_due", renewalFailedAt: new Date("2026-10-12T12:00:00Z") }],
] as const)("allows the confirmation from a student %s", async (_name, billing) => {
  const { studentId, accountId } = await studentWithThisWeek("student", billing);
  vi.setSystemTime(SATURDAY);

  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");

  expect((await saved(studentId, accountId)).snapshots).toHaveLength(2);
});

it("judges the plan by the real time, not a simulated date saved on the Account", async () => {
  const { studentId, accountId } = await studentWithThisWeek("student", inFreeWeek);
  await database.owner.execute(sql`update accounts set simulated_date = '2027-06-01' where id = ${accountId}`);
  vi.setSystemTime(SATURDAY);

  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).snapshots).toHaveLength(2);
});

it("hides a held weekly schedule and refuses its check-offs until the first charge succeeds", async () => {
  const { studentId, accountId } = await studentWithThisWeek("student", inFreeWeek);
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  const lastFreeWeekend = await dashboard();
  expect(lastFreeWeekend).toContain("Your free week ends Sunday.");
  expect(lastFreeWeekend).toContain("Your plan for next week appears then.");
  expect(lastFreeWeekend).not.toContain("Your week is ready.");

  vi.setSystemTime(NEXT_MONDAY);
  const held = await dashboard();
  expect(held).toContain("Your week is ready.");
  expect(held).toContain("It appears when your first payment goes through.");
  expect(held).not.toContain("Check off as you go.");
  expect(held).not.toContain('role="checkbox"');
  const heldWeek = (await listWeeklySchedulesForStudent(studentId)).find(({ weekStartDate }) => weekStartDate === "2026-10-19");
  if (!heldWeek) throw new Error("Expected the held weekly schedule to be saved");
  await expectUnexpectedFailure(database, saveActivityCheckIn({ scheduleId: heldWeek.id, activityId: "MONDAY:0", status: "completed" }), "Error");
  expect((await postgresActivityCheckIns.listForSchedule(heldWeek.id)).filter(({ status }) => status === "completed")).toEqual([]);

  await database.owner.execute(sql`update billing_records set first_charge_succeeded = true, stripe_status = 'active' where account_id = ${accountId}`);
  const shown = await dashboard();
  expect(shown).toContain("Check off as you go.");
  expect(shown).not.toContain("Your week is ready.");
  expect(shown).toContain('role="checkbox"');
  expect(await listWeeklySchedulesForStudent(studentId)).toContainEqual(heldWeek);
});

it("keeps the free week ending note, not the held weekly schedule, on a last free weekend with no weekly schedule", async () => {
  const { studentId } = await studentWithThisWeek("student", inFreeWeek);
  await database.owner.execute(sql`delete from weekly_schedules where student_id = ${studentId}`);
  await database.owner.execute(sql`delete from analytics_snapshots where student_id = ${studentId}`);
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload({ ...upload(SATURDAY), practiceTest: null })).rejects.toThrow("redirect:/dashboard");

  const page = await dashboard();
  expect(page).toContain("Your free week ends Sunday.");
  expect(page).toContain("Your plan for next week appears then.");
  expect(page).not.toContain("Your week is ready.");
  expect(page).not.toContain('role="checkbox"');
  expect((await listWeeklySchedulesForStudent(studentId)).map(({ weekStartDate }) => weekStartDate)).toEqual(["2026-10-19"]);
});

const lapsedAfterCancelling = { stripeStatus: "canceled", paidPeriodEndsAt: new Date("2026-10-17T05:00:00Z") } as const;

it.each([
  ["Plan next week", SATURDAY],
  ["Plan this week", new Date("2026-10-21T16:00:00Z")],
])("shows a lapsed student plan choice with no free week in place of %s", async (title, at) => {
  await studentWithThisWeek("student", lapsedAfterCancelling);
  vi.setSystemTime(at);

  const page = await uploadPage();

  expect(page).toContain("Pick a plan");
  expect(page).toContain("Your weekly schedules are paused. A new plan starts today, and your weekly upload opens right after.");
  expect(page).toContain("Add card on Stripe");
  expect(page).not.toContain("Free week");
  expect(page).not.toContain(title);
});

it("brings a lapsed student back from Stripe to plan choice, or to Starting your plan when they added a card", async () => {
  await studentWithThisWeek("student", lapsedAfterCancelling);
  vi.setSystemTime(SATURDAY);

  const closed = await uploadPage({ checkout: "closed", plan: "monthly" });
  expect(closed).toContain("You didn’t add a card.");
  expect(closed).toContain('checked="" value="monthly"');
  const done = await uploadPage({ checkout: "done" });
  expect(done).toContain("Starting your plan…");
  expect(done).toContain("Stripe is confirming your card. Your weekly upload opens next.");
});

it("sends a student with no plan from the weekly upload page to onboarding's plan choice", async () => {
  await studentWithThisWeek("student", null);
  vi.setSystemTime(SATURDAY);

  await expect(uploadPage()).rejects.toThrow("redirect:/onboarding");
});

it("shows a lapsed student's held weekly schedule on This week as soon as Stripe confirms the new plan, with no new upload", async () => {
  const { studentId, accountId } = await studentWithThisWeek("student", inFreeWeek);
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  await database.owner.execute(sql`update billing_records set stripe_status = 'past_due' where account_id = ${accountId}`);
  const schedules = await listWeeklySchedulesForStudent(studentId);

  const lapsed = await dashboard();
  expect(lapsed).toContain("Your payment didn&#x27;t go through.");
  expect(lapsed).toContain("Your week is saved.");
  expect(lapsed).not.toContain('role="checkbox"');
  expect(await uploadPage()).toContain("Pick a plan");

  await database.owner.execute(sql`
    update billing_records
    set stripe_subscription_id = 'sub_restart', stripe_status = 'active', first_charge_succeeded = true,
      free_week_ends_at = null, paid_period_ends_at = '2026-10-26T16:00:00Z'
    where account_id = ${accountId}`);
  await expect(uploadPage({ checkout: "done" })).rejects.toThrow(/^redirect:\/dashboard$/);
  const shown = await dashboard();
  expect(shown).toContain("Check off as you go.");
  expect(shown).not.toContain("Your week is saved.");
  expect(shown).not.toContain("Pick a plan");
  expect(shown).toContain('role="checkbox"');
  expect(await listWeeklySchedulesForStudent(studentId)).toEqual(schedules);
});

it("puts the plan ended note above a cancelled student's last weekly schedule, keeps its check-offs, and hides Plan next week", async () => {
  await studentWithThisWeek("student", { stripeStatus: "canceled", cancelAtPeriodEnd: true, paidPeriodEndsAt: new Date("2026-10-14T05:00:00Z") });
  vi.setSystemTime(SATURDAY);
  const page = await dashboard();
  expect(page).toContain("Your plan has ended.");
  expect(page).toContain('href="/dashboard/upload">Pick a plan</a>');
  expect(page.indexOf("Your plan has ended.")).toBeLessThan(page.indexOf("Monday"));
  expect(page).toContain('role="checkbox"');
  expect(page).not.toContain("Plan next week");
  expect(await progress()).toContain("Your plan has ended.");
});

it("shows the retrying note with Update card above the week and keeps Plan next week on the weekend, but no note on Progress", async () => {
  await studentWithThisWeek("student", { stripeStatus: "past_due", renewalFailedAt: new Date("2026-10-13T12:00:00Z") });
  vi.setSystemTime(SATURDAY);
  const page = await dashboard();
  expect(page).toContain("Your last payment didn&#x27;t go through.");
  expect(page).toContain("Update your card by Tue,\u00a0Oct\u00a020 to keep your plan.");
  expect(page).toContain("Update card</button>");
  expect(page).toContain("Plan next week");
  expect(await progress()).not.toContain("Your plan");
});

it.each([
  ["an admin", "admin", {}],
  ["a paid student", "student", {}],
  ["a free week student", "student", inFreeWeek],
] as const)("shows no plan note to %s on This week or Progress", async (_name, role, billing) => {
  await studentWithThisWeek(role, billing);
  vi.setSystemTime(new Date("2026-10-14T16:00:00Z"));
  expect(await dashboard()).not.toContain('aria-label="Your plan"');
  expect(await progress()).not.toContain('aria-label="Your plan"');
});

it("keeps a held weekly schedule out of Progress after a failed first charge lapses the student", async () => {
  const { accountId } = await studentWithThisWeek("student", inFreeWeek);
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  await database.owner.execute(sql`update billing_records set stripe_status = 'past_due' where account_id = ${accountId}`);

  vi.setSystemTime(new Date("2026-10-28T16:00:00Z"));
  const markup = await progress();
  expect(markup).toContain("Your payment didn&#x27;t go through.");
  expect(markup.indexOf('href="/dashboard/upload"')).toBeLessThan(markup.indexOf("/progress?week=2026-10-12"));
  expect(markup).toContain("/progress?week=2026-10-12");
  expect(markup).not.toContain("/progress?week=2026-10-19");
});

it("next Monday's weekly schedule uses the Saturday upload: missed type first, its week note, the result's id, and the saved score", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 160 }))).rejects.toThrow("redirect:/dashboard");
  const [practiceTest] = await listApprovedPracticeTestResults(studentId);

  vi.setSystemTime(NEXT_MONDAY);
  const markup = await dashboard();

  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(next.generationInputs.practiceTestResultId).toBe(practiceTest.id);
  expect(next.generationInputs.student.currentScore).toBe(160);
  const paired = Object.values(next.schedule.days).flatMap((day) => day.activities)
    .filter((activity) => activity.kind === "LR" && !activity.isFullSection && activity.types.length === 2);
  expect(paired).toHaveLength(2);
  const firstDrill = next.schedule.days.MONDAY.activities
    .flatMap((activity) => (activity.kind === "LR" && !activity.isFullSection ? [activity] : []))[0];
  expect(firstDrill?.types[0]).toBe("Flaw or descriptive weakening");
  expect(markup).toContain("Flaw or descriptive weakening comes first this week. You missed it most on your last practice test.");
});

it.each([
  ["some", { Science: 1, Law: 0.5 }],
  ["no", {}],
])("a weekly upload with %s RC passage-type values saves only those values and builds next Monday's weekly schedule", async (_name, rc) => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const body = upload(SATURDAY);
  const rows = [
    ...body.analytics.rows.filter(({ category }) => category !== "passage"),
    ...Object.entries(rc).map(([type, accuracy]) => ({ type, category: "passage", accuracy: accuracy * 100 })),
  ];
  await expect(confirmWeeklyUpload({ ...body, analytics: { ...body.analytics, rows } })).rejects.toThrow("redirect:/dashboard");

  const newest = (await listApprovedAnalyticsSnapshots(studentId)).find(({ approvedAt }) => approvedAt === SATURDAY.toISOString());
  expect(newest?.rcAccuracyByType).toEqual(rc);

  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(Object.values(next.schedule.days).flatMap((day) => day.activities).some((activity) => activity.kind === "RC")).toBe(true);
});

it("refuses a page built for next week once the upload window is over, without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const tuesday = new Date("2026-10-13T16:00:00Z");
  vi.setSystemTime(tuesday);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(tuesday))).resolves.toEqual({ error: "This page is out of date. Open This week to continue." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("a student with no plan on Wednesday plans the rest of this week from last week's practice test, with the missed type first", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const wednesday = new Date("2026-10-21T16:00:00Z");
  vi.setSystemTime(wednesday);
  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");

  await expect(confirmWeeklyUpload(upload(wednesday, { weekOf: "2026-10-19", currentScore: 160 }))).rejects.toThrow("redirect:/dashboard");
  const after = await saved(studentId, accountId);
  expect(after.score).toBe(160);
  expect(after.practiceTests).toHaveLength(1);

  const markup = await dashboard();
  const week = (await listWeeklySchedulesForStudent(studentId)).find(({ weekStartDate }) => weekStartDate === "2026-10-19");
  expect(week?.generationInputs).toMatchObject({ practiceTestResultId: after.practiceTests[0].id, student: { currentScore: 160 } });
  expect(week?.generationInputs.remainingDays[0]).toBe("WEDNESDAY");
  expect([week?.schedule.days.MONDAY.activities, week?.schedule.days.TUESDAY.activities]).toEqual([[], []]);
  const firstDrill = DAY_ORDER.flatMap((day) => week?.schedule.days[day].activities ?? [])
    .find((activity) => activity.kind === "LR" && !activity.isFullSection);
  expect(firstDrill?.kind === "LR" && firstDrill.types[0]).toBe("Flaw or descriptive weakening");
  expect(markup).toContain("Flaw or descriptive weakening comes first this week.");
});

it("opens the weekly upload on a weekday only while the week has no plan and no upload that counts for it", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(new Date("2026-10-13T16:00:00Z"));
  await expect(uploadPage()).rejects.toThrow(/^redirect:\/dashboard$/);

  vi.setSystemTime(new Date("2026-10-21T16:00:00Z"));
  const markup = await uploadPage();
  expect(markup).toContain("Plan this week");
  expect(markup).toContain("Your plan starts today and runs to Sunday, Oct 25.");

  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await expect(uploadPage()).rejects.toThrow(/^redirect:\/dashboard$/);
  expect((await listWeeklySchedulesForStudent(studentId)).map(({ weekStartDate }) => weekStartDate)).toEqual(["2026-10-12"]);
});

it("refuses a weekday upload once this week has a weekly schedule, without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  const tuesday = new Date("2026-10-13T16:00:00Z");
  vi.setSystemTime(tuesday);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(tuesday, { weekOf: "2026-10-12" })))
    .resolves.toEqual({ error: "This page is out of date. Open This week to continue." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("saves a practice test reviewed on Sunday and confirmed after midnight, and uses it for that Monday's plan", async () => {
  const { studentId } = await studentWithThisWeek();
  const justAfterMidnight = new Date("2026-10-19T05:30:00Z");
  vi.setSystemTime(justAfterMidnight);

  await expect(confirmWeeklyUpload(upload(justAfterMidnight))).rejects.toThrow("redirect:/dashboard");
  const [practiceTest] = await listApprovedPracticeTestResults(studentId);
  expect(practiceTest).toBeDefined();

  await dashboard();
  const next = (await listWeeklySchedulesForStudent(studentId)).find((record) => record.weekStartDate === "2026-10-19");
  expect(next?.generationInputs.practiceTestResultId).toBe(practiceTest.id);
});

it("a student who signs up on Saturday sees next week's saved plan as a read-only preview, and gets that plan on Monday", async () => {
  vi.setSystemTime(SATURDAY);
  const account = await database.createAccountAsOwner({ email: "weekend@example.test", name: "Sam", role: "student" });
  if (!account) throw new Error("Account fixture already exists");
  await database.writeBillingRecordAsOwner(account.id);
  const student = await createStudent(account.id, profile);
  if (!student) throw new Error("Student fixture already exists");
  state.session = { user: { id: account.id, role: "student", email: "weekend@example.test", name: "Sam" }, expires: "2099-01-01" };

  await expect(dashboard()).rejects.toThrow("redirect:/dashboard/upload");
  expect(await loadStudentNavState(account.id, SATURDAY)).toMatchObject({ uploadNeeded: true });
  await expect(confirmWeeklyUpload({ ...upload(SATURDAY), practiceTest: null })).rejects.toThrow("redirect:/dashboard");
  const weekend = await dashboard();
  expect(weekend).toContain("Next week · starts Monday, Oct 19");
  expect(weekend).toContain("Check-ins open on Monday.");
  expect(weekend).not.toContain('role="checkbox"');
  const [preview, ...others] = await listWeeklySchedulesForStudent(student.id);
  if (!preview) throw new Error("Expected next week's preview to be saved");
  expect(others).toEqual([]);
  expect(preview.weekStartDate).toBe("2026-10-19");
  expect(await postgresActivityCheckIns.listForSchedule(preview.id)).toEqual([]);
  await expect(uploadPage()).rejects.toThrow(/^redirect:\/dashboard$/);
  expect(await loadStudentNavState(account.id, SATURDAY)).toMatchObject({ hasCurrentWeek: false, hasUploadWeek: true, uploadNeeded: false });

  vi.setSystemTime(NEXT_MONDAY);
  const monday = await dashboard();
  expect(monday).toContain("Your plan for this week");
  expect(monday).toContain('role="checkbox"');
  expect(await listWeeklySchedulesForStudent(student.id)).toEqual([preview]);
});

it("rolls back the snapshot, the score, and the day's save count when the practice-test insert fails", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);
  const prepared = prepareWeeklyUpload(upload(SATURDAY), {
    clock: { now: SATURDAY, real: SATURDAY, simulated: false },
    schedules: await listWeeklySchedulesForStudent(studentId),
    allowAdminSample: false,
    scanningOff: { analytics: false, "practice-test-section": false },
  });
  if (!prepared.practiceTest) throw new Error("Expected a practice test");

  for (let index = 0; index < 5; index += 1) {
    await expect(approveWeeklyUpload(studentId, { ...prepared, practiceTest: { ...prepared.practiceTest, prepTest: 0 } }, { accountId, realNow: SATURDAY }))
      .rejects.toMatchObject({ cause: { code: "23514" } });
  }

  expect(await saved(studentId, accountId)).toEqual(before);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
});

it("refuses an invalid score or a missing practice test without saving anything", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const before = await saved(studentId, accountId);

  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 181 }))).resolves.toEqual({ error: "Enter a score from 120 to 180." });
  await expect(confirmWeeklyUpload({ ...upload(SATURDAY), practiceTest: null }))
    .resolves.toEqual({ error: "Add this week's practice test before you confirm." });

  expect(await saved(studentId, accountId)).toEqual(before);
});

it("with the owner's switch on, a practice-test week confirms without the practice test, and next week does not reuse an older one", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  vi.setSystemTime(NEXT_MONDAY);
  await dashboard();
  const [older] = await listApprovedPracticeTestResults(studentId);

  const nextSaturday = new Date("2026-10-24T17:00:00Z");
  vi.setSystemTime(nextSaturday);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  expect(await dashboard()).toContain("Plan next week");
  expect(await progress()).toContain("Progress");
  const page = await uploadPage();
  expect(page).toContain("Scanning is off right now. Enter your analytics by hand.");
  expect(page).toContain("Practice test skipped this week");

  await expect(confirmWeeklyUpload({ ...upload(nextSaturday, { weekOf: "2026-10-26" }), practiceTest: null }))
    .rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).practiceTests).toEqual([older]);

  vi.setSystemTime(new Date("2026-10-26T16:00:00Z"));
  expect(await dashboard()).not.toContain("You missed it most on your last practice test.");
  const weeks = await listWeeklySchedulesForStudent(studentId);
  expect(weeks.find(({ weekStartDate }) => weekStartDate === "2026-10-19")?.generationInputs.practiceTestResultId).toBe(older.id);
  expect(weeks.find(({ weekStartDate }) => weekStartDate === "2026-10-26")?.generationInputs).not.toHaveProperty("practiceTestResultId");
});

it("a later confirmation that skips the practice test keeps next week from using the same week's earlier result", async () => {
  const { studentId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");

  const sunday = new Date("2026-10-18T17:00:00Z");
  vi.setSystemTime(sunday);
  await database.owner.execute(sql`update scan_settings set scanning_off = true`);
  await expect(confirmWeeklyUpload({ ...upload(sunday), practiceTest: null })).rejects.toThrow("redirect:/dashboard");

  vi.setSystemTime(NEXT_MONDAY);
  expect(await dashboard()).not.toContain("You missed it most on your last practice test.");
  const [next] = await listWeeklySchedulesForStudent(studentId);
  expect(next.weekStartDate).toBe("2026-10-19");
  expect(next.generationInputs).not.toHaveProperty("practiceTestResultId");
});

it("at the monthly limit, a practice-test week confirms without the practice test; with scanning on, the old rule refuses it", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const skipped = { ...upload(SATURDAY), practiceTest: null };
  await database.owner.execute(sql`insert into scan_spending (month_start, total_usd) values ('2026-10-01T05:00:00Z', 9.98)`);
  expect(await uploadPage()).not.toContain("Scanning is off right now.");
  await expect(confirmWeeklyUpload(skipped)).rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).practiceTests).toEqual([]);

  await database.owner.execute(sql`update scan_settings set monthly_limit_usd = 15`);
  await expect(confirmWeeklyUpload(skipped)).resolves.toEqual({ error: "Add this week's practice test before you confirm." });
  expect(await uploadPage()).not.toContain("Practice test skipped");
});

it("lets only an admin confirm sample data, and Reset test data deletes the admin's practice-test results", async () => {
  const student = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { source: "admin_sample" })))
    .resolves.toEqual({ error: "Admin access required for sample analytics." });
  expect(await listApprovedPracticeTestResults(student.studentId)).toEqual([]);

  await database.owner.execute(sql`truncate accounts cascade`);
  const admin = await studentWithThisWeek("admin");
  vi.setSystemTime(SATURDAY);
  await expect(confirmWeeklyUpload(upload(SATURDAY, { source: "admin_sample" }))).rejects.toThrow("redirect:/dashboard");
  expect(await listApprovedPracticeTestResults(admin.studentId)).toHaveLength(1);

  await resetTestWorkspace(admin.accountId, "test-data", postgresAdminTestRepositories);
  expect(await listApprovedPracticeTestResults(admin.studentId)).toEqual([]);
  expect(await listApprovedAnalyticsSnapshots(admin.studentId)).toEqual([]);
});

it("refuses the 6th snapshot save in one Chicago day before any write, and allows saves again after midnight Central time", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  for (let index = 0; index < 5; index += 1) {
    await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 160 + index }))).rejects.toThrow("redirect:/dashboard");
  }
  const before = await saved(studentId, accountId);
  expect(before.snapshots).toHaveLength(6);

  await expect(confirmWeeklyUpload(upload(SATURDAY, { currentScore: 170 }))).resolves
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect(await saved(studentId, accountId)).toEqual(before);

  const sundayMidnight = new Date("2026-10-18T05:00:00Z");
  vi.setSystemTime(sundayMidnight);
  await expect(confirmWeeklyUpload(upload(sundayMidnight, { currentScore: 170 }))).rejects.toThrow("redirect:/dashboard");
  expect((await saved(studentId, accountId)).score).toBe(170);
});

it("counts an Admin's student-side saves on the real clock, whatever the simulated date", async () => {
  const { studentId, accountId } = await studentWithThisWeek("admin");
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-17' where id = ${accountId}`);
  vi.setSystemTime(SATURDAY);
  for (let index = 0; index < 5; index += 1) {
    await expect(confirmWeeklyUpload(upload(SATURDAY))).rejects.toThrow("redirect:/dashboard");
  }
  await database.owner.execute(sql`update accounts set simulated_date = '2026-10-18' where id = ${accountId}`);
  await expect(confirmWeeklyUpload(upload(SATURDAY))).resolves
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect((await saved(studentId, accountId)).snapshots).toHaveLength(6);
});

it("lets exactly 5 of 10 weekly upload confirms at the same time save", async () => {
  const { studentId, accountId } = await studentWithThisWeek();
  vi.setSystemTime(SATURDAY);
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => confirmWeeklyUpload(upload(SATURDAY))));

  expect(results.filter((result) => result.status === "rejected" && String(result.reason).includes("redirect:/dashboard"))).toHaveLength(5);
  expect(results.filter((result) => result.status === "fulfilled")).toEqual(Array(5).fill({
    status: "fulfilled",
    value: { error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." },
  }));
  expect((await saved(studentId, accountId)).snapshots).toHaveLength(6);
});
