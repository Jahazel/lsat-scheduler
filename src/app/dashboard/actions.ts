"use server";

import { studentSideNow } from "@/lib/studentClock";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { postgresActivityCheckIns } from "@/lib/activityCheckInRepository";
import { currentWeekInTimezone, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { DAY_ORDER } from "@/lib/engine";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { findStudentByAccountId } from "@/lib/studentRepository";
import { findWeeklyScheduleForStudent } from "@/lib/weeklyScheduleRepository";

const CheckInInput = z.object({
  scheduleId: z.uuid(),
  activityId: z.string().regex(/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY):\d+$/),
  status: z.enum(["not_started", "completed"]),
});

export async function saveActivityCheckIn(input: z.input<typeof CheckInInput>) {
  const parsed = CheckInInput.parse(input);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const student = await findStudentByAccountId(session.user.id);
  if (!student) throw new Error("Student record not found");
  const schedule = await findWeeklyScheduleForStudent(student.id, parsed.scheduleId);
  if (!schedule) throw new Error("Weekly schedule not found");
  const now = await studentSideNow(session.user);
  if (schedule.weekStartDate !== currentWeekInTimezone(now, SCHEDULE_TIMEZONE)) {
    throw new Error("Only this week's check-ins can change");
  }

  const [day, index] = parsed.activityId.split(":");
  const activityIndex = Number(index);
  const scheduleDay = DAY_ORDER.find((value) => value === day);
  const plan = scheduleDay ? schedule.schedule.days[scheduleDay] : undefined;
  if (!plan?.activities[activityIndex] || scheduleActivityId(plan.day, activityIndex) !== parsed.activityId) {
    throw new Error("Schedule activity not found");
  }

  const checkIn = await postgresActivityCheckIns.save({
    scheduleId: parsed.scheduleId,
    activityId: parsed.activityId,
    status: parsed.status,
  }, now);
  revalidatePath("/dashboard");
  return checkIn;
}
