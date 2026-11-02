import { goalScoreError, MAX_OFFICIAL_ATTEMPTS, type OfficialAttempt, type StudentProfileInput } from "./studentProfile";

export type Accommodation = StudentProfileInput["accommodationMultiplier"];

export function parseScoreText(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text) : null;
}

export function inScoreRange(score: number | null): score is number {
  return score !== null && score >= 120 && score <= 180;
}

export function scoreRangeMessage(which: string): string {
  return `LSAT scores go from 120 to 180. Check ${which}.`;
}

export function goalScoreMessage(currentScore: number, goalText: string): string | null {
  const goal = parseScoreText(goalText);
  return inScoreRange(goal) ? goalScoreError(currentScore, goal) : scoreRangeMessage("your goal score");
}

export type AttemptRow = { id: number; score: string; month: string };

export function addAttempt<Row extends AttemptRow>(rows: readonly Row[], row: Row): Row[] | null {
  return rows.length < MAX_OFFICIAL_ATTEMPTS ? [...rows, row] : null;
}

export function editAttempt<Row extends AttemptRow>(rows: readonly Row[], id: number, values: Partial<Omit<Row, "id">>): Row[] {
  return rows.map((row) => (row.id === id ? { ...row, ...values } : row));
}

export function removeAttempt<Row extends AttemptRow>(rows: readonly Row[], id: number): Row[] {
  return rows.filter((row) => row.id !== id);
}

export type AttemptProblem = "empty-score" | "out-of-range" | "no-month";
export type AttemptMessage = { box: "score" | "month"; text: string };

const ATTEMPT_MESSAGE: Record<AttemptProblem, AttemptMessage> = {
  "empty-score": { box: "score", text: "Enter the score from this attempt." },
  "out-of-range": { box: "score", text: scoreRangeMessage("this attempt's score") },
  "no-month": { box: "month", text: "Pick the month of this attempt." },
};

export function attemptProblem(row: Pick<AttemptRow, "score" | "month">): AttemptProblem | null {
  if (row.score.trim() === "") return "empty-score";
  if (!inScoreRange(parseScoreText(row.score))) return "out-of-range";
  return row.month === "" ? "no-month" : null;
}

export function attemptProblemMessage(row: Pick<AttemptRow, "score" | "month">): AttemptMessage | null {
  const problem = attemptProblem(row);
  return problem && ATTEMPT_MESSAGE[problem];
}

export function toOfficialAttempts(rows: readonly Pick<AttemptRow, "score" | "month">[]): OfficialAttempt[] {
  return rows.map(({ score, month }) => ({ score: Number(score), month }));
}
