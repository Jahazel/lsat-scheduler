import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { currentWeekInTimezone } from "@/lib/currentWeeklySchedule";
import { mongooseCurrentWeekRepositories } from "@/lib/weeklyScheduleRepository";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";
import { testCountdown, testCountdownLabel } from "@/lib/testCountdown";

export interface StudentNavState {
  countdownLabel: string | null;
  isTestDay: boolean;
  uploadNeeded: boolean;
}

export function initialsFor(name: string | null | undefined, email: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}

// Null means the user has no student profile yet (still onboarding).
export async function loadStudentNavState(userId: string, now = new Date()): Promise<StudentNavState | null> {
  await connectDB();
  const student = await StudentModel.findOne({ userId }).lean();
  if (!student) return null;

  const countdown = testCountdown(student.goalTestDate, now, SCHEDULE_TIMEZONE);
  // Only 7Sage students upload analytics, and the upload is what creates the current week.
  const currentWeek = student.platform === "7Sage"
    ? await mongooseCurrentWeekRepositories.weeklySchedules.findByStudentAndWeek(
        String(student._id),
        currentWeekInTimezone(now, SCHEDULE_TIMEZONE),
      )
    : null;

  return {
    countdownLabel: testCountdownLabel(countdown),
    isTestDay: countdown?.kind === "today",
    uploadNeeded: student.platform === "7Sage" && !currentWeek,
  };
}
