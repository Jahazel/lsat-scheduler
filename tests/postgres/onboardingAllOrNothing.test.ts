import { sql } from "drizzle-orm";
import type { Session } from "next-auth";
import { beforeEach, expect, it, vi } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { countAction } from "../../src/lib/actionLimits";

const request = vi.hoisted(() => ({ session: null as Session | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-vercel-forwarded-for": "203.0.113.7" }) }));
vi.mock("@/auth", () => ({ auth: async () => request.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { createStudentProfile } from "../../src/app/onboarding/actions";

const database = setUpAppTestDatabase();
beforeEach(async () => {
  request.session = null;
  await database.owner.execute(sql`truncate accounts, action_counters cascade`);
});

async function signedInStudent() {
  const account = await database.createAccountAsOwner({ email: "student@example.test", name: "Sam" });
  if (!account) throw new Error("Account fixture already exists");
  request.session = { user: { id: account.id, role: "student", email: "student@example.test", name: "Sam" }, expires: "2099-01-01" };
  return account;
}

function onboardingInput() {
  const now = new Date().toISOString();
  return {
    currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01", preferredPracticeTestDay: "SATURDAY" as const,
    accommodationMultiplier: 1 as const,
    dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 90, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 90 },
    officialAttempts: [],
    analyticsRows: [{ type: "Strengthen" as const, category: "regular" as const, accuracy: 0.6 }],
    analyticsApproval: {
      extraction: { source: "7sage_screenshot" as const, extractedAt: now },
      confirmation: { extractedValuesMatch: true as const, isLatestAnalytics: true as const, confirmedAt: now },
    },
  };
}

async function savedRows() {
  const students = await database.owner.execute(sql`select id from students`);
  const snapshots = await database.owner.execute(sql`select id from analytics_snapshots`);
  return { students: students.rows.length, snapshots: snapshots.rows.length };
}

async function withInsertTrigger(table: "students" | "analytics_snapshots", body: string, run: () => Promise<void>) {
  const name = sql.identifier(`onboarding_${table}_test`);
  await database.owner.execute(sql`create function ${name}() returns trigger language plpgsql security definer as
    $$ BEGIN ${sql.raw(body)} RETURN NEW; END; $$`);
  await database.owner.execute(sql`create trigger ${name} before insert on ${sql.identifier(table)}
    for each row execute function ${name}()`);
  try {
    await run();
  } finally {
    await database.owner.execute(sql`drop trigger ${name} on ${sql.identifier(table)}`);
    await database.owner.execute(sql`drop function ${name}()`);
  }
}

async function countSnapshotSaves(times: number, accountId: string) {
  const results = [];
  for (let save = 0; save < times; save += 1) results.push(await countAction("analyticsSnapshotSave", accountId, new Date()));
  return results;
}

it("two onboarding saves at the same time make one Student and one Analytics snapshot, and both go to the dashboard", async () => {
  await signedInStudent();
  const input = onboardingInput();
  await database.owner.execute(sql`create table student_insert_attempts (at timestamptz not null default clock_timestamp())`);
  await withInsertTrigger("students", "INSERT INTO student_insert_attempts DEFAULT VALUES;", () =>
    withInsertTrigger("analytics_snapshots", "PERFORM pg_sleep(0.5);", async () => {
      const results = await Promise.allSettled([createStudentProfile(input), createStudentProfile(input)]);
      expect(results.map((result) => result.status === "rejected" && String(result.reason)))
        .toEqual(["Error: redirect:/dashboard", "Error: redirect:/dashboard"]);
    }));
  expect((await database.owner.execute(sql`select at from student_insert_attempts`)).rows).toHaveLength(2);
  expect(await savedRows()).toEqual({ students: 1, snapshots: 1 });
});

it("a failure after the Student insert leaves no Student, no Analytics snapshot, and no used save, and the student can save again", async () => {
  const account = await signedInStudent();
  const input = onboardingInput();
  await withInsertTrigger("analytics_snapshots", "RAISE EXCEPTION 'forced snapshot failure';", async () => {
    await expect(createStudentProfile(input)).rejects.toMatchObject({ cause: { message: "forced snapshot failure" } });
  });
  expect(await savedRows()).toEqual({ students: 0, snapshots: 0 });

  await expect(createStudentProfile(input)).rejects.toThrow("redirect:/dashboard");
  expect(await savedRows()).toEqual({ students: 1, snapshots: 1 });
  expect(await countSnapshotSaves(5, account.id)).toEqual([...Array(4).fill({ allowed: true }), expect.objectContaining({ allowed: false })]);
});

it("a refused snapshot save limit leaves no Student and no Analytics snapshot", async () => {
  const account = await signedInStudent();
  await countSnapshotSaves(5, account.id);
  expect(await createStudentProfile(onboardingInput()))
    .toEqual({ error: "You've saved your analytics 5 times today. Try again tomorrow, after midnight Central time." });
  expect(await savedRows()).toEqual({ students: 0, snapshots: 0 });
});
