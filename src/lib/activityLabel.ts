import type { Activity } from "./types";

export function activityLabel(activity: Activity) {
  switch (activity.kind) {
    case "LR":
      return `${activity.questionCount} ${activity.type} (${activity.difficultyRange})`;
    case "RC":
      return `${activity.passageCount} ${activity.type} passage${activity.passageCount === 1 ? "" : "s"} (L${activity.difficultyLevel})`;
    case "PT":
    case "REVIEW":
      return activity.label;
  }
}
