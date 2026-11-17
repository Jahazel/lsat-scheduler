import { DAY_ORDER, generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import { scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { weekNotes } from "@/lib/scheduleCheckInSummary";
import { practiceTestMinutes } from "@/lib/studentProfile";
import type { Accommodation } from "@/lib/studyProfileDraft";
import { weeklyTotalMinutes } from "@/lib/studyWeek";
import type { ActivityCheckIn, DayOfWeek, Student as LiveStudent, WeeklySchedule } from "@/lib/types";
import type { Student } from "../data";

export const WEEK_START = "2026-11-09";
export const TODAY_ISO = "2026-11-13";
const TODAY_INDEX = 4;

export const NO_WEEK = {
  held: "This student's weekly schedule for this week is held. It appears when their first payment goes through.",
  saved: "This student has saved their plan for next week. It starts Monday, November 16.",
  confirmed: "This student has confirmed their upload for next week, which starts Monday, November 16. Their plan is saved when they open This week.",
  analytics: "This student needs confirmed, eligible analytics before a current weekly schedule can be created.",
  missing: "No saved schedule exists for the current week. The student must open their dashboard to create it.",
};
export type NoWeek = keyof typeof NO_WEEK;

export type LiveWeek = { schedule: WeeklySchedule; student: LiveStudent; checkIns: ActivityCheckIn[] };
export type Detail = { current: number | null; goal: number; daysToTest: number; week: LiveWeek | null; noWeek: NoWeek };

const TEST_MONTH: Record<string, string> = { "Jan 10": "2027-01-01", "Feb 7": "2027-02-01", "Mar 14": "2027-03-01", "Apr 11": "2027-04-01" };
const TEST_DAYS: Record<string, number> = { "Jan 10": 58, "Feb 7": 86, "Mar 14": 121, "Apr 11": 149 };

const TEST_TIME: Record<string, Accommodation> = { s3: 1.5, w1: 2, w5: 1.5 };
const testTimeFor = (student: Student): Accommodation =>
  TEST_TIME[student.id] ?? (student.id.startsWith("m") && Number(student.id.slice(1)) % 7 === 3 ? 1.5 : 1);

export function liveStudentFor(student: Student, current: number, goal: number): LiveStudent {
  const accommodation = testTimeFor(student);
  const perDay = Math.min(480, Math.max(30, Math.round(student.minutesPerWeek / 7 / 15) * 15));
  const saturday = Math.max(perDay, 210, Math.ceil(practiceTestMinutes(accommodation) / 15) * 15);
  const capacity = Object.fromEntries(DAY_ORDER.map((d) => [d, d === "SATURDAY" ? saturday : perDay])) as Record<DayOfWeek, number>;
  return { currentScore: current, goalScore: goal, dailyCapacityMinutes: capacity, preferredPracticeTestDay: "SATURDAY", accommodationMultiplier: accommodation, goalTestDate: TEST_MONTH[student.testDate] ?? "2027-01-01", ...SAVED_AS[student.id] };
}

const SAVED_AS: Record<string, Partial<LiveStudent>> = {
  w3: { dailyCapacityMinutes: { MONDAY: 30, TUESDAY: 30, WEDNESDAY: 480, THURSDAY: 30, FRIDAY: 45, SATURDAY: 30, SUNDAY: 30 }, preferredPracticeTestDay: "WEDNESDAY" },
  w4: { goalTestDate: "2026-10-01" },
};

export const weeklyMinutes = (student: Student) => weeklyTotalMinutes(liveStudentFor(student, 150, 165));

function liveWeek(student: Student, current: number, goal: number, doneCount: number): LiveWeek {
  const live = liveStudentFor(student, current, goal);
  const schedule = generateWeek(live, { ...mockAnalytics, weekOf: WEEK_START }, mockRules, student.name ?? student.email);
  const ids = DAY_ORDER.flatMap((d) => schedule.days[d].activities.map((_, i) => scheduleActivityId(d, i)));
  return { schedule, student: live, checkIns: ids.slice(0, doneCount).map((activityId) => ({ scheduleId: `proto-${student.id}`, activityId, status: "completed" })) };
}

const BY_ID: Record<string, { current: number | null; goal: number; done: number | null; noWeek: NoWeek }> = {
  s1: { current: 158, goal: 170, done: 12, noWeek: "missing" },
  s2: { current: null, goal: 165, done: 8, noWeek: "missing" },
  s3: { current: 151, goal: 165, done: 3, noWeek: "missing" },
  s4: { current: 146, goal: 160, done: null, noWeek: "held" },
  s5: { current: null, goal: 170, done: null, noWeek: "analytics" },
  w2: { current: null, goal: 160, done: null, noWeek: "analytics" },
  w5: { current: 139, goal: 175, done: null, noWeek: "held" },
};

const cache = new Map<string, Detail>();
export function detailFor(student: Student): Detail {
  const hit = cache.get(student.id);
  if (hit) return hit;
  const n = Number(student.id.replace(/\D/g, "")) || 0;
  const known = BY_ID[student.id] ?? {
    current: student.needsAnalytics ? null : 140 + (n % 25),
    goal: 165 + (n % 3) * 5,
    done: student.hasThisWeek ? (n * 3) % 16 : null,
    noWeek: student.needsAnalytics ? "analytics" : n % 3 === 0 ? "saved" : "missing",
  };
  const detail: Detail = {
    current: known.current, goal: known.goal, noWeek: known.noWeek,
    daysToTest: TEST_DAYS[student.testDate] ?? 58,
    week: known.done === null ? null : liveWeek(student, known.current ?? 150, known.goal, known.done),
  };
  cache.set(student.id, detail);
  return detail;
}

export function pace(week: LiveWeek) {
  const done = new Set(week.checkIns.filter((c) => c.status === "completed").map((c) => c.activityId));
  const before = DAY_ORDER.slice(0, TODAY_INDEX).reduce((sum, d) => sum + week.schedule.days[d].activities.length, 0);
  const total = DAY_ORDER.reduce((sum, d) => sum + week.schedule.days[d].activities.length, 0);
  const lead = done.size - before;
  return { done: done.size, total, label: lead < 0 ? `${-lead} behind` : lead > 0 ? `${lead} ahead` : "On pace", behind: lead < 0 };
}

export const notesOf = (week: LiveWeek) => weekNotes(week.schedule);
export const testLabel = (student: Student, detail: Detail) => `${student.testDate} · ${detail.daysToTest} days`;
