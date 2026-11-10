import type { Activity, LRDrill, RCDrill } from "./types";

export const SEVEN_SAGE_URL = "https://7sage.com/subscribe";
export const DRILL_LINK_PARAMETER = "drill";

export type StepText = (string | { value: string })[];

/** One drill to build on 7Sage. A paired LR drill or a two-passage RC drill takes two. */
export interface SevenSageDrill {
  tags: string;
  difficulty: { low: number; high: number };
  count: number;
  unit: "questions" | "passages";
}

export interface DrillSetupGuide {
  section: "Logical Reasoning" | "Reading Comprehension";
  drills: [SevenSageDrill] | [SevenSageDrill, SevenSageDrill];
  total: string;
  steps: { title: string; text: StepText }[];
}

const STEP_TITLES = ["Start a drill on 7Sage", "Customize the questions", "Set the filters", "Set the count and start"];

export function difficultyText({ low, high }: SevenSageDrill["difficulty"]) {
  const levels = Array.from({ length: high - low + 1 }, (_, index) => `${low + index}`);
  return levels.length === 1 ? levels[0]! : `${levels.slice(0, -1).join(", ")} and ${levels.at(-1)}`;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function lrDrills(drill: LRDrill): DrillSetupGuide["drills"] | null {
  const range = /^L([1-5])-([1-5])$/.exec(drill.difficultyRange);
  if (!range) return null;
  const difficulty = { low: Number(range[1]), high: Number(range[2]) };
  const toSevenSageDrill = (tags: string, count: number): SevenSageDrill => ({ tags, difficulty, count, unit: "questions" });
  if (drill.types.length === 1) return [toSevenSageDrill(drill.types[0], drill.questionCount)];
  const firstCount = Math.ceil(drill.questionCount / 2);
  return [toSevenSageDrill(drill.types[0], firstCount), toSevenSageDrill(drill.types[1], drill.questionCount - firstCount)];
}

function rcDrills(drill: RCDrill): DrillSetupGuide["drills"] {
  const toSevenSageDrill = ({ type, difficultyLevel }: RCDrill["passages"][number]): SevenSageDrill =>
    ({ tags: type, difficulty: { low: difficultyLevel, high: difficultyLevel }, count: 1, unit: "passages" });
  const [first, second] = drill.passages.toSorted((a, b) => a.difficultyLevel - b.difficultyLevel);
  return second ? [toSevenSageDrill(first!), toSevenSageDrill(second)] : [toSevenSageDrill(first!)];
}

/** The drill setup guide for one schedule activity, or null when it is not a drill the guide covers. */
export function drillSetupGuide(activity: Activity): DrillSetupGuide | null {
  if ((activity.kind !== "LR" && activity.kind !== "RC") || activity.isFullSection) return null;
  const drills = activity.kind === "LR" ? lrDrills(activity) : rcDrills(activity);
  if (!drills) return null;
  const section = activity.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension";
  const difficultyFilter = activity.kind === "LR" ? "Question Difficulty" : "Passage Difficulty";
  const tagsGroup = activity.kind === "RC" ? " (under RC passage subject)" : "";
  const countFilter = `Number of ${drills[0].unit}`;
  const total = activity.kind === "LR" ? plural(activity.questionCount, "question") : plural(drills.length, "passage");
  const [first, second] = drills;
  const filters = (lead: string): StepText => [`${lead} Tags to `, { value: first.tags }, `${tagsGroup} and ${difficultyFilter} to `, { value: difficultyText(first.difficulty) }, "."];
  const start: StepText = [`Set ${countFilter} to `, { value: `${first.count}` }, ". Pick any Timing, then click ", { value: "Start Drill" }, "."];
  const texts: StepText[] = [
    ["Open 7Sage. Go to Study, then ", { value: "Drills and sections" }, ". Under ", { value: section }, ", click ", { value: "Start drill" }, "."],
    ["Click ", { value: "Customize questions" }, "."],
    second ? filters("You build this as two drills on 7Sage. For the first, set") : filters("Set"),
    second
      ? [...start, ` When it ends, repeat steps 1 to ${STEP_TITLES.length} with Tags set to `, { value: second.tags }, `${tagsGroup} and ${difficultyFilter} set to `,
        { value: difficultyText(second.difficulty) }, `, and ${countFilter} set to `, { value: `${second.count}` }, "."]
      : start,
  ];
  return { section, drills, total, steps: texts.map((text, index) => ({ title: STEP_TITLES[index]!, text })) };
}
