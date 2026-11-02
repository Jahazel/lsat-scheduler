import { describe, expect, it } from "vitest";
import {
  addAttempt,
  attemptProblem,
  attemptProblemMessage,
  editAttempt,
  goalScoreMessage,
  parseScoreText,
  removeAttempt,
  scoreRangeMessage,
  toOfficialAttempts,
  type AttemptRow,
} from "./studyProfileDraft";

const row = (id: number, score = "", month = ""): AttemptRow => ({ id, score, month });

describe("score text", () => {
  it("reads whole numbers, ignoring surrounding spaces, and nothing else", () => {
    expect(parseScoreText(" 165 ")).toBe(165);
    expect(parseScoreText("")).toBeNull();
    expect(parseScoreText("16.5")).toBeNull();
    expect(parseScoreText("-150")).toBeNull();
    expect(parseScoreText("abc")).toBeNull();
  });

  it("names the box in the range message", () => {
    expect(scoreRangeMessage("your current score")).toBe("LSAT scores go from 120 to 180. Check your current score.");
  });

  it("asks for a goal in range, then above the current score", () => {
    expect(goalScoreMessage(150, "")).toBe("LSAT scores go from 120 to 180. Check your goal score.");
    expect(goalScoreMessage(150, "181")).toBe("LSAT scores go from 120 to 180. Check your goal score.");
    expect(goalScoreMessage(150, "150")).toBe("Your goal must be higher than your current score, 150.");
    expect(goalScoreMessage(150, "180")).toBeNull();
  });
});

describe("official attempt rows", () => {
  it("adds a row up to 10, then refuses", () => {
    const nine = Array.from({ length: 9 }, (_, id) => row(id));
    const ten = addAttempt(nine, row(9));
    expect(ten?.map(({ id }) => id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(addAttempt(ten ?? [], row(10))).toBeNull();
  });

  it("edits and removes only the row with the given id, keeping extra fields", () => {
    const rows = [{ ...row(0), left: false }, { ...row(1), left: false }];
    expect(editAttempt(rows, 1, { score: "160", left: true })).toEqual([{ ...row(0), left: false }, { ...row(1, "160"), left: true }]);
    expect(removeAttempt(rows, 0)).toEqual([{ ...row(1), left: false }]);
  });

  it("names one problem per row, score first", () => {
    expect(attemptProblem(row(0))).toBe("empty-score");
    expect(attemptProblemMessage(row(0))).toEqual({ box: "score", text: "Enter the score from this attempt." });
    expect(attemptProblem(row(0, "119", "2026-06"))).toBe("out-of-range");
    expect(attemptProblemMessage(row(0, "119", "2026-06"))).toEqual({
      box: "score",
      text: "LSAT scores go from 120 to 180. Check this attempt's score.",
    });
    expect(attemptProblem(row(0, "160"))).toBe("no-month");
    expect(attemptProblemMessage(row(0, "160"))).toEqual({ box: "month", text: "Pick the month of this attempt." });
    expect(attemptProblem(row(0, " 160 ", "2026-06"))).toBeNull();
    expect(attemptProblemMessage(row(0, " 160 ", "2026-06"))).toBeNull();
  });

  it("turns rows into the saved attempts", () => {
    expect(toOfficialAttempts([row(3, " 160 ", "2026-06"), row(7, "171", "2025-09")])).toEqual([
      { score: 160, month: "2026-06" },
      { score: 171, month: "2025-09" },
    ]);
  });
});
