import { sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import { setUpAppTestDatabase } from "./appTestDatabase";
import { isWeekHeld, studentsWhoseWeekIsHeld, withoutHeldWeek } from "../../src/lib/heldWeek";
import { createStudent } from "../../src/lib/studentRepository";
import type { Student } from "../../src/lib/types";

const database = setUpAppTestDatabase();
beforeEach(async () => {
  await database.owner.execute(sql`truncate accounts cascade`);
});

const profile: Student = {
  currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01",
  preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: 1,
  dailyCapacityMinutes: { MONDAY: 90, TUESDAY: 60, WEDNESDAY: 90, THURSDAY: 90, FRIDAY: 90, SATURDAY: 90, SUNDAY: 60 },
};

type Billing = "free week ending Oct 12" | "paid" | "none";

async function student(name: string, billing: Billing) {
  const account = await database.createAccountAsOwner({ email: `${name}@example.test`, name, role: "student" });
  if (!account) throw new Error("Account fixture already exists");
  if (billing === "paid") await database.writeBillingRecordAsOwner(account.id);
  if (billing === "free week ending Oct 12") {
    await database.writeBillingRecordAsOwner(account.id, {
      stripeStatus: "trialing", firstChargeSucceeded: false, freeWeekEndsAt: new Date("2026-10-12T05:00:00Z"),
    });
  }
  const saved = await createStudent(account.id, profile);
  if (!saved) throw new Error("Student fixture already exists");
  return saved.id;
}

it("holds only the week after the free week, and only before the first charge succeeds", async () => {
  const freeWeek = await student("free", "free week ending Oct 12");
  const paid = await student("paid", "paid");
  const noPlan = await student("none", "none");

  expect(await isWeekHeld(freeWeek, "2026-10-12")).toBe(true);
  expect(await isWeekHeld(freeWeek, "2026-10-05")).toBe(false);
  expect(await isWeekHeld(paid, "2026-10-12")).toBe(false);
  expect(await isWeekHeld(noPlan, "2026-10-12")).toBe(false);

  const weeks = [{ weekStartDate: "2026-10-12" }, { weekStartDate: "2026-10-05" }];
  expect(await withoutHeldWeek(freeWeek, weeks)).toEqual([{ weekStartDate: "2026-10-05" }]);
  expect(await withoutHeldWeek(paid, weeks)).toEqual(weeks);
  expect(await withoutHeldWeek(noPlan, weeks)).toEqual(weeks);

  expect(await studentsWhoseWeekIsHeld([freeWeek, paid, noPlan], "2026-10-12")).toEqual(new Set([freeWeek]));
  expect(await studentsWhoseWeekIsHeld([freeWeek, paid, noPlan], "2026-10-05")).toEqual(new Set());
  expect(await studentsWhoseWeekIsHeld([], "2026-10-12")).toEqual(new Set());

  await database.owner.execute(sql`update billing_records set first_charge_succeeded = true, stripe_status = 'active'`);
  expect(await isWeekHeld(freeWeek, "2026-10-12")).toBe(false);
});
