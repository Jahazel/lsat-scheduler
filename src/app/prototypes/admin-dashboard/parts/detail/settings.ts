import { attemptMonths, type OfficialAttempt } from "@/lib/studentProfile";
import { previewWeek } from "@/lib/studyWeek";
import type { Student } from "../data";
import { TODAY_ISO, liveStudentFor, type Detail } from "./data";

const ATTEMPTS: Record<string, OfficialAttempt[]> = {
  s1: [{ month: "2026-09", score: 156 }, { month: "2026-06", score: 152 }],
  s3: [{ month: "2026-08", score: 149 }],
  s4: [{ month: "2026-06", score: 146 }, { month: "2026-02", score: 144 }, { month: "2025-11", score: 141 }],
  w1: Array.from({ length: 10 }, (_, i) => ({ month: `${2026 - Math.floor(i / 4)}-${String(10 - (i % 4) * 3).padStart(2, "0")}`, score: i === 0 ? 180 : i === 9 ? 120 : 170 - i * 4 })),
  w5: [{ month: "2026-10", score: 180 }],
};
function attemptsFor(student: Student): OfficialAttempt[] {
  const n = Number(student.id.slice(1));
  return ATTEMPTS[student.id] ?? (student.id.startsWith("m") && n % 4 === 1 ? [{ month: "2026-06", score: 140 + (n % 20) }] : []);
}

export const monthLabel = (value: string) => attemptMonths(TODAY_ISO).find((m) => m.value === value)?.label ?? value;
const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const testMonth = (value: string) => ({ label: LONG_MONTH.format(new Date(`${value}T00:00:00Z`)), passed: value.slice(0, 7) < TODAY_ISO.slice(0, 7) });

export function settingsFor(student: Student, detail: Detail) {
  const saved = liveStudentFor(student, detail.current ?? 150, detail.goal);
  return { saved, current: detail.current, week: previewWeek(saved), attempts: attemptsFor(student) };
}
export type Settings = ReturnType<typeof settingsFor>;

export const ATTEMPT_NOTE = "For the student's record. Attempts do not change the plan.";
