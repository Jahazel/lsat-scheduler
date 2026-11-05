import type { Activity, LRDrill, RCDrill } from "./types";

export const SEVEN_SAGE_URL = "https://7sage.com/";

export type StepText = (string | { value: string })[];

export interface FilterPass {
  tags: string;
  difficulty: { low: number; high: number };
  add: number;
  unit: "questions" | "passage";
}

export interface DrillSetupGuide {
  section: "Logical Reasoning" | "Reading Comprehension";
  passes: [FilterPass] | [FilterPass, FilterPass];
  total: string;
  guess: { tags: boolean; difficulty: boolean };
  steps: { title: string; text: StepText }[];
}

const STEP_TITLES = ["Open Drills on 7Sage", "Start a new drill", "Choose Customize", "Filter and add questions", "Check the count and save"];

export const difficultyText = ({ low, high }: FilterPass["difficulty"]) => low === high ? `${low}` : `${low} to ${high}`;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function lrPasses(drill: LRDrill): DrillSetupGuide["passes"] | null {
  const range = /^L([1-5])-([1-5])$/.exec(drill.difficultyRange);
  if (!range) return null;
  const difficulty = { low: Number(range[1]), high: Number(range[2]) };
  const pass = (tags: string, add: number): FilterPass => ({ tags, difficulty, add, unit: "questions" });
  if (drill.types.length === 1) return [pass(drill.types[0], drill.questionCount)];
  const firstAdd = Math.ceil(drill.questionCount / 2);
  return [pass(drill.types[0], firstAdd), pass(drill.types[1], drill.questionCount - firstAdd)];
}

function rcPasses(drill: RCDrill): DrillSetupGuide["passes"] {
  const pass = ({ type, difficultyLevel }: RCDrill["passages"][number]): FilterPass =>
    ({ tags: type, difficulty: { low: difficultyLevel, high: difficultyLevel }, add: 1, unit: "passage" });
  const [first, second] = drill.passages.toSorted((a, b) => a.difficultyLevel - b.difficultyLevel);
  return second ? [pass(first!), pass(second)] : [pass(first!)];
}

function filterStep([first, second]: DrillSetupGuide["passes"]): StepText {
  const text: StepText = ["Set Tags to ", { value: first.tags }, " and Difficulty to ", { value: difficultyText(first.difficulty) },
    ". Click ", { value: "Add" }, " on ", { value: `${first.add}` }, ` ${first.unit}.`];
  if (!second) return text;
  return [...text, " Then set Tags to ", { value: second.tags }, " and Difficulty to ", { value: difficultyText(second.difficulty) },
    ", and add ", { value: `${second.add}` }, " more."];
}

/** The drill setup guide for one schedule activity, or null when it is not a drill the guide covers. */
export function drillSetupGuide(activity: Activity): DrillSetupGuide | null {
  if ((activity.kind !== "LR" && activity.kind !== "RC") || activity.isFullSection) return null;
  const passes = activity.kind === "LR" ? lrPasses(activity) : rcPasses(activity);
  if (!passes) return null;
  const section = activity.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension";
  const total = activity.kind === "LR" ? plural(activity.questionCount, "question") : plural(passes.length, "passage");
  const texts: StepText[] = [
    ["Open 7Sage. Go to Study, then Practice, then ", { value: "Drills" }, "."],
    ["Under ", { value: section }, ", click ", { value: "New drill" }, "."],
    ["Skip the adaptive drill. Click ", { value: "Customize" }, "."],
    filterStep(passes),
    ["Check that it says ", { value: `${total} selected` }, ". Click ", { value: "Save & share" }, ", then start the drill."],
  ];
  return {
    section,
    passes,
    total,
    guess: { tags: activity.kind === "RC", difficulty: true },
    steps: texts.map((text, index) => ({ title: STEP_TITLES[index]!, text })),
  };
}
