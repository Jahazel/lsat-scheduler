import type { Activity, LRDrill } from "./types";

export function lrTypesName(types: LRDrill["types"]): string {
  if (types.length === 1) return types[0];
  const [firstWords, secondWords] = types.map((type) => type.split(" "));
  const sharesLastWord = firstWords.length === 2 && secondWords.length === 2 && firstWords[1] === secondWords[1];
  return `${sharesLastWord ? firstWords[0] : types[0]} + ${types[1]}`;
}

export function activityLabel(activity: Activity) {
  switch (activity.kind) {
    case "LR":
      if (activity.isFullSection) return "1 Full LR Section";
      return `${activity.questionCount} ${lrTypesName(activity.types)} (${activity.difficultyRange})`;
    case "RC": {
      if (activity.isFullSection) return "1 Full RC Section";
      const names = activity.passages.map(({ type }) => `1 ${type}`).join(" + ");
      const levels = activity.passages.map(({ difficultyLevel }) => difficultyLevel).sort((a, b) => a - b);
      const range = levels[0] === levels.at(-1) ? `L${levels[0]}` : `L${levels[0]}-${levels.at(-1)}`;
      return `${names} passage (${range})`;
    }
    case "PT":
    case "REVIEW":
      return activity.label;
  }
}
