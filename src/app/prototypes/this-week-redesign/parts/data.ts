import { activityLabel } from "@/lib/activityLabel";
import { drillSetupGuide, type DrillSetupGuide } from "@/lib/drillSetupGuide";
import type { Activity as LiveActivity, LRDrill, RCDrill } from "@/lib/types";
import type { DataSet, PlanNote, Ticks, Today, View, Who } from "../view";

export const DAY_KEYS: Today[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_NAMES: Record<Today, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export type DayKind = "drill" | "rest" | "practice" | "review" | "unscheduled";
export type Activity = { id: string; label: string; minutes: number; guide: DrillSetupGuide | null };
// notes: the live day-scope schedule reasons (src/lib/engine.ts dayReason), shown on the day card.
export type Day = { key: Today; date: string; kind: DayKind; capacity: number; activities: Activity[]; reason?: string; notes?: string[] };

export type Student = { firstName: string; fullName: string; email: string; current: number; goal: number; testMonth: string; weeksAway: number; daysAway: number };

export type Week = {
  student: Student;
  weekOf: string;
  notes: string[];
  days: Day[];
  doneIds: string[];
};

const DATES = ["Nov 9", "Nov 10", "Nov 11", "Nov 12", "Nov 13", "Nov 14", "Nov 15"];

/* Fixture rows are written short ("5 Strengthen (L2-4)", "1 Law passage (L3)"). Each one becomes a real schedule activity,
   so the row shows the live label (src/lib/activityLabel.ts) and Set up opens the live drill setup guide. */
function live(text: string, minutes: number): LiveActivity {
  if (/^1 Full (LR|RC) Section$/.test(text)) return { kind: text.includes("LR") ? "LR" : "RC", isFullSection: true, drillMinutes: minutes };
  if (text.startsWith("Practice Test")) return { kind: "PT", label: text, minutes };
  if (text.startsWith("PT Review")) return { kind: "REVIEW", label: text, minutes };
  const [, body, low, high] = /^(.+) \(L(\d)(?:-(\d))?\)$/.exec(text)!;
  if (/passage/.test(body!)) {
    const levels = [Number(low), Number(high ?? low)];
    const passages = body!.split(" + ").map((part, i) => ({ type: /^1 (\w+)/.exec(part)![1], difficultyLevel: levels[i]! }));
    return { kind: "RC", isFullSection: false, passages: passages as RCDrill["passages"], drillMinutes: minutes };
  }
  const [, count, names] = /^(\d+) (.+)$/.exec(body!)!;
  const parts = names!.split(" + ");
  const types = parts.length === 2 && !parts[0]!.includes(" ") ? [`${parts[0]} ${parts[1]!.split(" ").at(-1)}`, parts[1]] : parts;
  return { kind: "LR", isFullSection: false, types: types as LRDrill["types"], questionCount: Number(count), difficultyRange: `L${low}-${high}`, drillMinutes: minutes };
}

const a = (day: Today, i: number, text: string, minutes: number): Activity => {
  const activity = live(text, minutes);
  return { id: `${day}-${i}`, label: activityLabel(activity), minutes, guide: drillSetupGuide(activity) };
};

function day(key: Today, kind: DayKind, capacity: number, labels: [string, number][], reason?: string): Day {
  const i = DAY_KEYS.indexOf(key);
  return { key, date: DATES[i]!, kind, capacity, reason, activities: labels.map(([label, minutes], n) => a(key, n, label, minutes)) };
}

const DEMO: Week = {
  student: { firstName: "Dana", fullName: "Dana Ruiz", email: "dana.ruiz@example.com", current: 150, goal: 165, testMonth: "January 2027", weeksAway: 9, daysAway: 61 },
  weekOf: "November 9",
  notes: [
    "Sufficient assumption comes first this week. You missed it most on your last practice test.",
    "Weaken sits out this week in the starred rotation.",
  ],
  days: [
    day("mon", "drill", 90, [["5 Strengthen (L2-4)", 25], ["5 Inference (L2-4)", 25], ["1 Law passage (L3)", 20]]),
    day("tue", "drill", 90, [["1 Full LR Section", 35], ["1 Science passage (L3-4)", 20]]),
    day("wed", "rest", 0, []),
    day("thu", "drill", 120, [["10 Necessary + Sufficient assumption (L2-4)", 40], ["5 Most strongly supported (L2-4)", 20], ["5 Parallel method of reasoning (L2-4)", 25], ["1 Humanities + 1 Science passage (L3-4)", 30]]),
    day("fri", "drill", 60, [["5 Flaw or descriptive weakening (L2-4)", 20], ["5 Must be true (L2-4)", 20]]),
    day("sat", "practice", 210, [["Practice Test (from PT 130+)", 175]]),
    day("sun", "review", 150, [["PT Review + Blind Review", 150]]),
  ],
  doneIds: ["mon-0", "mon-1", "mon-2", "tue-0"],
};

const WORST: Week = {
  student: { firstName: "Maximiliana", fullName: "Maximiliana Alexandrovna Konstantinopoulou-Whitfield", email: "maximiliana.konstantinopoulou-whitfield.lsat2027@university-graduate-school.example.com", current: 120, goal: 180, testMonth: "June 2027", weeksAway: 29, daysAway: 201 },
  weekOf: "November 9",
  // Real sentence shapes from src/lib/scheduleReasonText.ts, one per week-note type the engine can add together.
  notes: [
    "Parallel method of reasoning comes first this week. You missed it most on your last practice test.",
    "Flaw or descriptive weakening, Must be true, and Point at issue / point of agreement sit out this week in the starred rotation.",
    "No full section this week: no remaining drilling day has 60 minutes of daily capacity.",
    "No practice test this week; your next one is Saturday, Nov 21.",
    "Your Wednesday holds less than a full practice test at 2× time, so the practice test moved to Saturday.",
  ],
  days: [
    day("mon", "unscheduled", 480, [], "Not scheduled because this weekly schedule started Tuesday."),
    day("tue", "drill", 480, [
      ["10 Necessary + Sufficient assumption (L2-4)", 40], ["5 Most strongly supported (L2-4)", 20], ["5 Parallel method of reasoning (L2-4)", 25],
      ["5 Flaw or descriptive weakening (L2-4)", 20], ["1 Humanities + 1 Science passage (L3-4)", 30], ["5 PSA - find the rule (L4-5)", 25],
    ]),
    // The longest real LR type names, paired, and the part-minutes a 1.5× time student gets.
    day("wed", "drill", 480, [
      ["1 Full LR Section", 52.5], ["10 PSA - find or complete the application + Lack of support v. false conclusion (L3-5)", 67.5],
      ["1 Comparative passage set + 1 Law passage (L4-5)", 45], ["5 Parallel flawed method of reasoning (L2-4)", 37.5], ["5 Inference (L2-4)", 37.5], ["1 Law passage (L3)", 30],
    ]),
    day("thu", "drill", 480, [
      ["10 Necessary + Sufficient assumption (L2-4)", 40], ["5 Most strongly supported (L2-4)", 20], ["5 Parallel method of reasoning (L2-4)", 25],
      ["5 Flaw or descriptive weakening (L2-4)", 20], ["1 Humanities + 1 Science passage (L3-4)", 30], ["5 Method of reasoning or descriptive (L3-5)", 25],
    ]),
    day("fri", "drill", 480, [
      ["5 Must be true (L2-4)", 20], ["5 Strengthen (L2-4)", 25], ["5 Inference (L2-4)", 25],
      ["1 Science passage (L3-4)", 20], ["5 Most strongly supported (L2-4)", 20], ["5 Sufficient assumption (L2-4)", 25],
    ]),
    day("sat", "practice", 480, [["Practice Test (from PT 130+)", 262.5]]),
    // A second practice test: the live header reads "Practice test 2 of 2", and its review moves to next Monday.
    { ...day("sun", "practice", 480, [["Practice Test (from PT 130+)", 262.5]]), notes: ["The practice-test review day is next Monday in the next weekly schedule."] },
  ],
  doneIds: ["tue-0", "tue-1", "tue-2", "tue-3", "tue-4", "tue-5", "wed-0"],
};

// The one-off edges: a single activity all week, and a goal test date that has already passed (the live countdown hides itself then).
const EDGE: Week = {
  student: { firstName: "Jo", fullName: "Jo", email: "jo@example.com", current: 179, goal: 180, testMonth: "November 2026", weeksAway: 0, daysAway: -4 },
  weekOf: "November 9",
  notes: ["No practice test this week."],
  days: [
    day("mon", "rest", 0, []), day("tue", "rest", 0, []), day("wed", "rest", 0, []),
    day("thu", "drill", 30, [["1 Full LR Section", 35]]),
    day("fri", "rest", 0, []), day("sat", "rest", 0, []), day("sun", "rest", 0, []),
  ],
  doneIds: [],
};

// The test is 4 days away and the schedule started on Sunday, its only rest day, so nothing is planned.
const NEAR: Week = {
  student: { firstName: "Jo", fullName: "Jo", email: "jo@example.com", current: 168, goal: 172, testMonth: "November 2026", weeksAway: 0, daysAway: 4 },
  weekOf: "November 9",
  notes: [],
  days: [
    ...(["mon", "tue", "wed", "thu", "fri", "sat"] as const).map((key) => day(key, "unscheduled", 120, [], "Not scheduled because this weekly schedule started Sunday.")),
    day("sun", "rest", 0, []),
  ],
  doneIds: [],
};

const LIGHT: Week = {
  student: { firstName: "Jo", fullName: "Jo", email: "jo@example.com", current: 168, goal: 172, testMonth: "December 2026", weeksAway: 1, daysAway: 0 },
  weekOf: "November 9",
  notes: [],
  days: [
    day("mon", "drill", 30, [["1 Full LR Section", 35]]),
    { ...day("tue", "rest", 0, []), notes: ["Rest day moved to Tuesday: Wednesday was reserved for a practice-test review."] },
    day("wed", "rest", 0, []),
    day("thu", "drill", 30, [["5 Inference (L2-4)", 25]]),
    day("fri", "rest", 0, []),
    day("sat", "practice", 180, [["Practice Test (from PT 130+)", 175]]),
    day("sun", "rest", 0, []),
  ],
  doneIds: ["mon-0"],
};

const SIX: [string, number][] = [
  ["5 Strengthen (L2-4)", 25], ["5 Inference (L2-4)", 25], ["1 Law passage (L3)", 20],
  ["5 Must be true (L2-4)", 20], ["5 Flaw or descriptive weakening (L2-4)", 20], ["1 Science passage (L3-4)", 20],
];

// Six drills on each of five days: the most the engine plans in one week.
const BUSY: Week = {
  ...DEMO,
  notes: [DEMO.notes[0]!],
  days: [
    ...(["mon", "tue", "wed", "thu", "fri"] as const).map((key) => day(key, "drill", 180, SIX)),
    day("sat", "practice", 210, [["Practice Test (from PT 130+)", 175]]),
    day("sun", "review", 150, [["PT Review + Blind Review", 150]]),
  ],
  doneIds: [...SIX.map((_, i) => `mon-${i}`), ...SIX.map((_, i) => `tue-${i}`), ...SIX.slice(0, 4).map((_, i) => `wed-${i}`)],
};

// The week before the goal test: a second practice test on Wednesday, so the rest day moves to Tuesday (src/lib/engine.ts).
const NEARTEST: Week = {
  student: { firstName: "Dana", fullName: "Dana Ruiz", email: "dana.ruiz@example.com", current: 161, goal: 165, testMonth: "November 2026", weeksAway: 1, daysAway: 9 },
  weekOf: "November 9",
  notes: ["This near-test week has 2 LawHub practice tests before your November 21 test."],
  days: [
    day("mon", "drill", 90, [["5 Strengthen (L2-4)", 25], ["5 Inference (L2-4)", 25], ["1 Law passage (L3)", 20]]),
    { ...day("tue", "rest", 0, []), notes: ["Rest day moved to Tuesday to fit this week's practice tests and reviews."] },
    day("wed", "practice", 210, [["Practice Test (from PT 130+)", 175]]),
    day("thu", "review", 150, [["PT Review + Blind Review", 150]]),
    day("fri", "drill", 60, [["5 Must be true (L2-4)", 20], ["5 Sufficient assumption (L2-4)", 25]]),
    day("sat", "practice", 210, [["Practice Test (from PT 130+)", 175]]),
    day("sun", "review", 150, [["PT Review + Blind Review", 150]]),
  ],
  doneIds: ["mon-0", "mon-1", "mon-2", "wed-0"],
};

export const WEEKS: Record<DataSet, Week> = { demo: DEMO, worst: WORST, busy: BUSY, neartest: NEARTEST, empty: LIGHT, edge: EDGE, near: NEAR };

// The name and email cases from the brief, laid over any data set.
const WHO: Record<Exclude<Who, "data">, Pick<Student, "firstName" | "fullName" | "email">> = {
  noname: { firstName: "", fullName: "", email: "student4821@example.com" },
  one: { firstName: "Q", fullName: "Q", email: "q@example.com" },
  nonlatin: { firstName: "美咲", fullName: "佐藤 美咲", email: "misaki.sato@example.jp" },
  emoji: { firstName: "🌟Ana", fullName: "🌟Ana López", email: "ana.lopez@example.com" },
};

export function weekFor(view: Pick<View, "data" | "who">): Week {
  const week = WEEKS[view.data];
  return view.who === "data" ? week : { ...week, student: { ...week.student, ...WHO[view.who] } };
}

// The ticks a page opens with: the data set's own, none, every one up to and including today, or the whole week.
export function startTicks(week: Week, ticks: Ticks, today: Today): string[] {
  if (ticks === "data") return week.doneIds;
  const upTo = ticks === "all" ? week.days : week.days.slice(0, DAY_KEYS.indexOf(today) + 1);
  return ticks === "none" ? [] : upTo.flatMap((d) => d.activities.map((x) => x.id));
}

export const KIND_LABEL: Record<DayKind, string> = {
  drill: "Drilling", rest: "Rest day", practice: "Practice test", review: "Practice-test review", unscheduled: "Not scheduled",
};

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function pace(week: Week, today: Today, done: Set<string>) {
  const todayIndex = DAY_KEYS.indexOf(today);
  const all = week.days.flatMap((d) => d.activities);
  const due = week.days.filter((d) => DAY_KEYS.indexOf(d.key) < todayIndex).flatMap((d) => d.activities).length;
  const lead = done.size - due;
  return { total: all.length, done: done.size, due, label: lead < 0 ? `${-lead} behind` : lead > 0 ? `${lead} ahead` : "On pace", behind: lead < 0 };
}

export type NoteText = { lead: string; rest: string; action?: string };
// Same words as src/lib/planNotes.ts freeWeekEndingNote: a saved next week adds "appears then".
export function noteText(view: Pick<View, "note" | "week">): NoteText | null {
  if (view.note === "none") return null;
  const text = NOTE_TEXT[view.note];
  return view.note === "ending" && view.week === "heldpreview" ? { ...text, rest: `${text.rest} Your plan for next week appears then.` } : text;
}

export const NOTE_TEXT: Record<Exclude<PlanNote, "none">, NoteText> = {
  ending: { lead: "Your free week ends Sunday.", rest: "Your Weekly plan starts Monday at $10 a week." },
  retrying: { lead: "Your last payment didn't go through.", rest: "Update your card by Nov 19 to keep your plan.", action: "Update card" },
  lapsed: { lead: "Your plan has ended.", rest: "Pick a plan to get new weekly schedules.", action: "Pick a plan" },
};

// Same words as src/lib/testCountdown.ts testCountdownLabel.
export function countdown(week: Week) {
  const d = week.student.daysAway;
  if (d < 0) return null;
  if (d === 0) return "Test day";
  return `${d} ${d === 1 ? "day" : "days"} to test`;
}

export function initials(student: Student) {
  // Same rule as src/lib/studentNav.ts initialsFor.
  const words = student.fullName.trim().split(/\s+/).filter(Boolean);
  // Fix for emoji or other multi-part characters: take whole characters, not halves of them.
  const chars = (word: string) => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word), (part) => part.segment);
  if (words.length > 1) return `${chars(words[0]!)[0]}${chars(words.at(-1)!)[0]}`.toUpperCase();
  if (words.length === 1) return chars(words[0]!).slice(0, 2).join("").toUpperCase();
  return (chars(student.email)[0] ?? "?").toUpperCase();
}
