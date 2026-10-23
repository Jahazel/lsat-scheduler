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
      const { length } = activity.passages;
      const passages = activity.passages.map(({ type, difficultyLevel }) => `${type} L${difficultyLevel}`).join(", ");
      return `${length} RC ${length === 1 ? "Passage" : "Passages"} ${passages}`;
    }
    case "PT":
    case "REVIEW":
      return activity.label;
  }
}
