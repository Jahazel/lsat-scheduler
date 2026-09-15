"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { mongooseActivityCheckIns } from "@/lib/activityCheckInRepository";
import { scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { WeeklyScheduleModel } from "@/models/WeeklySchedule";
import { ADMIN_READ_ONLY_MESSAGE, isAdminUser } from "@/lib/accessControl";

const CheckInInput = z.object({
  scheduleId: z.string().min(1),
  activityId: z.string().regex(/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY):\d+$/),
  status: z.enum(["not_started", "completed", "skipped"]),
  actualMinutes: z.number().finite().nonnegative().optional(),
});

export async function saveActivityCheckIn(input: z.input<typeof CheckInInput>) {
  const parsed = CheckInInput.parse(input);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (isAdminUser(session.user)) throw new Error(ADMIN_READ_ONLY_MESSAGE);

  await connectDB();
  const student = await StudentModel.findOne({ userId: session.user.id }).lean();
  if (!student) throw new Error("Student record not found");
  const schedule = await WeeklyScheduleModel.findOne({ _id: parsed.scheduleId, studentId: student._id }).lean();
  if (!schedule) throw new Error("Weekly schedule not found");

  const [day, index] = parsed.activityId.split(":");
  const activityIndex = Number(index);
  const plan = schedule.schedule.days[day as keyof typeof schedule.schedule.days];
  if (!plan?.activities[activityIndex] || scheduleActivityId(plan.day, activityIndex) !== parsed.activityId) {
    throw new Error("Schedule activity not found");
  }

  const checkIn = await mongooseActivityCheckIns.save({
    scheduleId: parsed.scheduleId,
    activityId: parsed.activityId,
    status: parsed.status,
    ...(parsed.status === "completed" && parsed.actualMinutes !== undefined
      ? { actualMinutes: parsed.actualMinutes }
      : {}),
  });
  revalidatePath("/dashboard");
  return checkIn;
}
