import { DAY_ORDER, generateWeek } from "@/lib/engine";
import { scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import type { ActivityCheckIn, RCType } from "@/lib/types";
import type { Student } from "../data";
import { liveStudentFor, type Detail, type LiveWeek } from "./data";

const DAY_MS = 86_400_000;
const LAST_PAST_WEEK = Date.UTC(2026, 10, 2);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const shortDate = (isoDate: string) => short.format(new Date(`${isoDate}T00:00:00Z`));

function noise(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function weekLabel(start: string) {
  const ms = Date.parse(`${start}T00:00:00Z`);
  return `${short.format(ms)} – ${short.format(ms + 6 * DAY_MS)}`;
}

export function byMonth<T>(items: T[], start: (item: T) => string): { month: string; items: T[] }[] {
  const months = new Map<string, T[]>();
  for (const item of items) {
    const month = monthYear.format(Date.parse(`${start(item)}T00:00:00Z`));
    months.set(month, [...(months.get(month) ?? []), item]);
  }
  return [...months].map(([month, items]) => ({ month, items }));
}

export type PastWeek = { start: string; label: string; done: number; total: number };
export type PastMonth = { month: string; weeks: PastWeek[] };

function weekStarts(count: number) {
  return Array.from({ length: count }, (_, i) => iso(LAST_PAST_WEEK - i * 7 * DAY_MS));
}

export function pastWeeksFor(student: Student): PastMonth[] {
  const weeks = weekStarts(student.pastWeeks).map((start) => {
    const total = 18 + Math.round(noise(student.id + start) * 10);
    const done = Math.round(total * (0.45 + noise(start + student.id) * 0.55));
    return { start, label: weekLabel(start), done, total };
  });
  return byMonth(weeks, (w) => w.start).map(({ month, items }) => ({ month, weeks: items }));
}

export function pastWeekSchedule(student: Student, detail: Detail, week: PastWeek): LiveWeek {
  const live = liveStudentFor(student, detail.current ?? 150, detail.goal);
  const schedule = generateWeek(live, { ...mockAnalytics, weekOf: week.start }, mockRules, "Student");
  const ids = DAY_ORDER.flatMap((d) => schedule.days[d].activities.map((_, i) => scheduleActivityId(d, i)));
  const done = Math.min(ids.length, Math.round((week.done / week.total) * ids.length));
  const checkIns: ActivityCheckIn[] = ids.slice(0, done).map((activityId) => ({ scheduleId: `past-${week.start}`, activityId, status: "completed" }));
  return { schedule, student: live, checkIns };
}

export type Snapshot = { week: string; lr: Record<string, number>; rc: Partial<Record<RCType, number>> };
export type PracticeTest = { prepTest: number; week: string; missed: number; missedTypes: [string, number][] };
export type Performance = { snapshots: Snapshot[]; scores: { week: string; score: number }[]; tests: PracticeTest[]; goal: number };

const LR_BASE = mockAnalytics.lrAccuracyByType as Record<string, number>;
export const LR_TYPES = Object.keys(LR_BASE);
const RC_TYPES: RCType[] = ["Art", "Humanities", "Science", "Law", "Comparative"];
const clamp = (x: number) => Math.min(1, Math.max(0, Math.round(x * 100) / 100));

export function performanceFor(student: Student, detail: Detail): Performance {
  if (detail.current === null) return { snapshots: [], scores: [], tests: [], goal: detail.goal };
  const count = student.pastWeeks + 1;
  const starts = weekStarts(count).reverse();
  const rcCount = student.id === "w3" ? 0 : student.id === "w1" ? 5 : 2 + Math.round(noise(student.id) * 3);
  const rcTypes = RC_TYPES.slice(0, rcCount);
  const snapshots: Snapshot[] = starts.map((week, i) => {
    const age = count - 1 - i;
    const lr = Object.fromEntries(LR_TYPES.map((t) => {
      const climb = (noise(student.id + t) - 0.35) * 0.04;
      return [t, clamp(LR_BASE[t]! - age * climb + (noise(t + week + student.id) - 0.5) * 0.08)];
    }));
    const rc = Object.fromEntries(rcTypes.map((t) => [t, clamp(0.55 + noise(student.id + t) * 0.35 - age * 0.01 + (noise(week + t) - 0.5) * 0.06)])) as Snapshot["rc"];
    return { week, lr, rc };
  });
  const scores = starts.map((week, i) => ({ week, score: Math.round(detail.current! - (count - 1 - i) * (0.4 + noise(student.id) * 0.6) + (noise(week) - 0.5) * 3) }));
  const tests: PracticeTest[] = starts.filter((_, i) => (count - 1 - i) % 2 === 1).map((week, i) => {
    const sorted = LR_TYPES.toSorted((a, b) => snapshots.at(-1)!.lr[a]! - snapshots.at(-1)!.lr[b]!);
    const kinds = 2 + Math.round(noise(week + student.id) * (student.id === "w1" ? 9 : 4));
    const missedTypes = sorted.slice(0, kinds).map((t, k) => [t, Math.max(1, 4 - k + Math.round(noise(t + week) * 2))] as [string, number]);
    return { prepTest: 128 + i * 3 + Math.round(noise(week) * 2), week, missed: missedTypes.reduce((s, [, n]) => s + n, 0) + Math.round(noise(student.id + week) * 6), missedTypes };
  });
  return { snapshots, scores, tests: tests.reverse(), goal: detail.goal };
}

export function lrRows(perf: Performance) {
  const newest = perf.snapshots.at(-1);
  const before = perf.snapshots.at(-2);
  if (!newest) return [];
  return LR_TYPES.map((type) => ({ type, value: newest.lr[type]!, change: before ? newest.lr[type]! - before.lr[type]! : null, series: perf.snapshots.map((s) => s.lr[type]!) }))
    .toSorted((a, b) => a.value - b.value);
}

export function rcRows(perf: Performance) {
  const newest = perf.snapshots.at(-1);
  const before = perf.snapshots.at(-2);
  if (!newest) return [];
  return (Object.keys(newest.rc) as RCType[]).map((type) => ({ type, value: newest.rc[type]!, change: before?.rc[type] !== undefined ? newest.rc[type]! - before.rc[type]! : null, series: perf.snapshots.map((s) => s.rc[type] ?? 0) }))
    .toSorted((a, b) => a.value - b.value);
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(Math.round(x * 100))}`;
