import type { DataSet, Who } from "../view";

export type PlanKind = "no_plan" | "free_week" | "paid" | "retrying" | "lapsed";
export const PLAN_LABELS: Record<PlanKind, string> = { no_plan: "No plan", free_week: "Free week", paid: "Paid", retrying: "Retrying", lapsed: "Lapsed" };

export type Student = {
  id: string;
  name: string | null;
  email: string;
  plan: PlanKind;
  needsAnalytics: boolean;
  minutesPerWeek: number;
  testDate: string;
  joined: string;
  hasThisWeek: boolean;
  pastWeeks: number;
};

export type Admin = { name: string | null; email: string };

const DEMO: Student[] = [
  { id: "s1", name: "Maya Thompson", email: "maya.thompson@gmail.com", plan: "paid", needsAnalytics: false, minutesPerWeek: 840, testDate: "Jan 10", joined: "Sep 2", hasThisWeek: true, pastWeeks: 10 },
  { id: "s2", name: "Daniel Okafor", email: "dokafor@umich.edu", plan: "free_week", needsAnalytics: true, minutesPerWeek: 420, testDate: "Feb 7", joined: "Nov 9", hasThisWeek: true, pastWeeks: 0 },
  { id: "s3", name: "Priya Raman", email: "priya.raman.law@outlook.com", plan: "retrying", needsAnalytics: false, minutesPerWeek: 1260, testDate: "Jan 10", joined: "Oct 5", hasThisWeek: true, pastWeeks: 5 },
  { id: "s4", name: "Lucas Moreau", email: "lucas@moreau.fr", plan: "lapsed", needsAnalytics: false, minutesPerWeek: 600, testDate: "Mar 14", joined: "Aug 17", hasThisWeek: false, pastWeeks: 12 },
  { id: "s5", name: "Hannah Kim", email: "hkim2026@gmail.com", plan: "no_plan", needsAnalytics: true, minutesPerWeek: 210, testDate: "Apr 11", joined: "Nov 12", hasThisWeek: false, pastWeeks: 0 },
];

const WORST: Student[] = [
  { id: "w1", name: "Maximiliana Alexandrovna Konstantinopolous-Vanderbilt de la Cruz", email: "maximiliana.alexandrovna.konstantinopolous.vanderbilt@lawschoolapplicants.example.com", plan: "retrying", needsAnalytics: true, minutesPerWeek: 3360, testDate: "Jan 10", joined: "Sep 2", hasThisWeek: true, pastWeeks: 26 },
  { id: "w2", name: null, email: "noname.student@gmail.com", plan: "no_plan", needsAnalytics: true, minutesPerWeek: 210, testDate: "Feb 7", joined: "Nov 12", hasThisWeek: false, pastWeeks: 0 },
  { id: "w3", name: "J", email: "j@x.io", plan: "paid", needsAnalytics: false, minutesPerWeek: 600, testDate: "Mar 14", joined: "Oct 1", hasThisWeek: true, pastWeeks: 1 },
  { id: "w4", name: "王小明", email: "wangxiaoming@qq.com", plan: "free_week", needsAnalytics: false, minutesPerWeek: 900, testDate: "Jan 10", joined: "Nov 8", hasThisWeek: true, pastWeeks: 0 },
  { id: "w5", name: "محمد عبد الرحمن", email: "m.abdulrahman@student.example.ae", plan: "lapsed", needsAnalytics: false, minutesPerWeek: 1500, testDate: "Apr 11", joined: "Jul 30", hasThisWeek: false, pastWeeks: 14 },
];

const FIRST = ["Ava", "Noah", "Sofia", "Ethan", "Zara", "Mateo", "Leah", "Owen", "Isla", "Caleb", "Nadia", "Theo"];
const LAST = ["Nguyen", "Patel", "Garcia", "Johnson", "Cohen", "Silva", "Brooks", "Haddad", "Larsen", "Ito"];
const PLANS: PlanKind[] = ["paid", "paid", "free_week", "paid", "retrying", "no_plan", "paid", "lapsed"];

const MANY: Student[] = Array.from({ length: 60 }, (_, i) => {
  const first = FIRST[i % FIRST.length]!;
  const last = LAST[(i * 7) % LAST.length]!;
  return {
    id: `m${i}`,
    name: `${first} ${last}`,
    email: `${first}.${last}${i}@gmail.com`.toLowerCase(),
    plan: PLANS[i % PLANS.length]!,
    needsAnalytics: i % 5 === 2,
    minutesPerWeek: 210 + ((i * 97) % 3150),
    testDate: ["Jan 10", "Feb 7", "Mar 14", "Apr 11"][i % 4]!,
    joined: `Oct ${1 + (i % 28)}`,
    hasThisWeek: i % 6 !== 5,
    pastWeeks: i % 27,
  };
});

export function studentsFor(data: DataSet): Student[] {
  if (data === "none") return [];
  if (data === "one") return DEMO.slice(0, 1);
  if (data === "many") return MANY;
  if (data === "worst") return WORST;
  if (data === "same") return DEMO.map((s) => ({ ...s, plan: "paid" }));
  return DEMO;
}

export function adminFor(who: Who): Admin {
  if (who === "noname") return { name: null, email: "admin@drillmap.app" };
  if (who === "long") return { name: "Alexandria Montgomery-Fitzgerald Okonkwo", email: "alexandria.montgomery.fitzgerald.okonkwo@drillmap-administration.example.com" };
  return { name: "Jordan Reyes", email: "jordan@drillmap.app" };
}

export const initials = (person: { name: string | null; email: string }) => {
  const source = person.name?.trim() || person.email;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${[...parts[0]!][0]}${[...parts.at(-1)!][0]}` : [...source][0] ?? "?";
  return letters.toUpperCase();
};

export const hours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

