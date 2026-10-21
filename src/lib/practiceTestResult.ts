import { mockRules } from "@/lib/mockData";
import type { LRStemType } from "@/lib/types";

export type QuestionResult = "correct" | "wrong" | "unanswered" | "hidden";
export interface LRRow { question: number; result: QuestionResult; tags: string[] }

interface SectionHeader { page: "section_review"; prepTest: number; section: number; score: number; reachesEnd: boolean }
export type RCSectionReading = SectionHeader & { kind: "RC" };
export type LRSectionReading = SectionHeader & { kind: "LR"; rows: LRRow[] };
export type SectionReview = RCSectionReading | LRSectionReading;
export type SectionReading = SectionReview | { page: "analytics" | "other" };

const STEM_TAGS: Record<string, LRStemType> = {
  NA: "Necessary assumption",
  SA: "Sufficient assumption",
  Flaw: "Flaw or descriptive weakening",
  Weak: "Weaken",
  Streng: "Strengthen",
  RRE: "Resolve reconcile or explain",
  MSS: "Most strongly supported",
  MBT: "Must be true",
  MBF: "Must be false",
  MC: "Main conclusion or main point",
  Inf: "Inference",
  AP: "Argument part",
  Method: "Method of reasoning or descriptive",
  PF: "Parallel flawed method of reasoning",
  Para: "Parallel method of reasoning",
  PSAa: "PSA - find or complete the application",
  PSAr: "PSA - find the rule",
  Princ: "Principle",
  Disagr: "Point at issue: disagree",
  Exc: "Except (LR)",
  Fill: "Fill in the blank",
};

function stemTypesOf(tags: string[]): LRStemType[] {
  return [...new Set(tags.flatMap((tag) => (Object.hasOwn(STEM_TAGS, tag) ? [STEM_TAGS[tag]] : [])))];
}

export interface HiddenResult { section: number; question: number; result: "correct" | "missed"; settledBy: "score" | "student" }
export interface Miss { section: number; question: number; result: "wrong" | "unanswered" | "hidden" }
export interface MissedStemType { type: LRStemType; misses: Miss[] }
export type PracticeTestSection =
  | { section: number; kind: "RC"; score: number; missed: number }
  | { section: number; kind: "LR"; score: number; missed: number; rows: LRRow[] };

export interface PracticeTestResult {
  prepTest: number;
  sections: PracticeTestSection[];
  hiddenResults: HiddenResult[];
  missedStemTypes: MissedStemType[];
  missedQuestions: number;
  missedStemTypeCounts: Partial<Record<LRStemType, number>>;
}

export interface ApprovedPracticeTestResult {
  id: string;
  approvedAt: string;
  prepTest: number;
  missedStemTypeCounts: PracticeTestResult["missedStemTypeCounts"];
}

export interface HiddenPick { section: number; missed: number[] }

export type PracticeTestProblem =
  | { problem: "wrong-page"; file: number; shows: "analytics" | "other" }
  | { problem: "different-prep-test"; file: number; prepTest: number; expected: number }
  | { problem: "same-section-twice"; file: number; section: number; missingSection: number | null }
  | { problem: "section-missing"; section: number }
  | { problem: "cut-off"; file: number; section: number; lastQuestion: number | null }
  | { problem: "score-mismatch"; file: number; section: number; score: number; missed: number }
  | { problem: "hidden-pick"; file: number; section: number; pick: number; candidates: { question: number; stemTypes: LRStemType[] }[] };

export type PracticeTestReview = { ok: true; result: PracticeTestResult } | { ok: false; problems: PracticeTestProblem[] };

const SECTIONS = [1, 2, 3, 4];
const MIN_LR_QUESTIONS = 24;

const isMissed = (result: QuestionResult) => result === "wrong" || result === "unanswered";

const scoredSections = (files: SectionReading[]) =>
  files.flatMap((file) => (file.page === "section_review" && SECTIONS.includes(file.section) ? [file] : []));

function isCutOff(section: SectionReview) {
  if (!section.reachesEnd) return true;
  return section.kind === "LR" && (section.rows.length < MIN_LR_QUESTIONS
    || section.rows.some((row, index) => row.question !== index + 1));
}

function settleHidden(section: LRSectionReading, file: number, picks: HiddenPick[]): HiddenResult[] | PracticeTestProblem {
  const hidden = section.rows.filter((row) => row.result === "hidden");
  const known = section.rows.filter((row) => isMissed(row.result)).length;
  const need = Math.abs(section.score) - known;
  if (need < 0 || need > hidden.length) {
    return { problem: "score-mismatch", file, section: section.section, score: section.score, missed: known };
  }
  const settle = (missed: (question: number) => boolean, settledBy: HiddenResult["settledBy"]) =>
    hidden.map(({ question }): HiddenResult => ({
      section: section.section, question, result: missed(question) ? "missed" : "correct", settledBy,
    }));
  if (need === 0 || need === hidden.length) return settle(() => need > 0, "score");
  const picked = new Set(picks.find((pick) => pick.section === section.section)?.missed);
  const hiddenQuestions = new Set(hidden.map(({ question }) => question));
  if (picked.size === need && [...picked].every((question) => hiddenQuestions.has(question))) {
    return settle((question) => picked.has(question), "student");
  }
  return {
    problem: "hidden-pick", file, section: section.section, pick: need,
    candidates: hidden.map(({ question, tags }) => ({ question, stemTypes: stemTypesOf(tags) })),
  };
}

function missedStemTypes(sections: LRSectionReading[], hiddenResults: HiddenResult[]): MissedStemType[] {
  const misses = new Map<LRStemType, Miss[]>();
  for (const { section, rows } of sections) {
    for (const { question, result, tags } of rows) {
      if (result === "correct") continue;
      if (result === "hidden"
        && !hiddenResults.some((h) => h.section === section && h.question === question && h.result === "missed")) continue;
      for (const type of stemTypesOf(tags)) {
        misses.set(type, [...(misses.get(type) ?? []), { section, question, result }]);
      }
    }
  }
  return [...misses]
    .map(([type, typeMisses]) => ({ type, misses: typeMisses }))
    .sort((a, b) => b.misses.length - a.misses.length
      || mockRules.lrStemTypes.indexOf(a.type) - mockRules.lrStemTypes.indexOf(b.type));
}

export function reviewPracticeTest(files: SectionReading[], picks: HiddenPick[] = []): PracticeTestReview {
  const problems: PracticeTestProblem[] = [];
  const kept = new Map<number, SectionReview>();
  const hiddenResults: HiddenResult[] = [];
  const present = new Set(scoredSections(files).map((file) => file.section));
  const missing = SECTIONS.filter((section) => !present.has(section));
  const expected = scoredSections(files)[0]?.prepTest;

  files.forEach((file, index) => {
    if (file.page !== "section_review") {
      problems.push({ problem: "wrong-page", file: index, shows: file.page });
    } else if (!SECTIONS.includes(file.section)) {
      problems.push({ problem: "wrong-page", file: index, shows: "other" });
    } else if (file.prepTest !== expected) {
      problems.push({ problem: "different-prep-test", file: index, prepTest: file.prepTest, expected: expected ?? file.prepTest });
    } else if (kept.has(file.section)) {
      problems.push({ problem: "same-section-twice", file: index, section: file.section, missingSection: missing[0] ?? null });
    } else {
      kept.set(file.section, file);
      if (isCutOff(file)) {
        const lastQuestion = file.kind === "LR" ? file.rows.at(-1)?.question ?? null : null;
        problems.push({ problem: "cut-off", file: index, section: file.section, lastQuestion });
        return;
      }
      if (file.kind !== "LR") return;
      const settled = settleHidden(file, index, picks);
      if (Array.isArray(settled)) hiddenResults.push(...settled);
      else problems.push(settled);
    }
  });
  problems.push(...missing.map((section): PracticeTestProblem => ({ problem: "section-missing", section })));
  if (problems.length > 0 || expected === undefined) return { ok: false, problems };

  const sections = [...kept.values()].sort((a, b) => a.section - b.section);
  const lrSections = sections.filter((section): section is LRSectionReading => section.kind === "LR");
  const types = missedStemTypes(lrSections, hiddenResults);
  const hiddenMissed = (section: number) =>
    hiddenResults.filter((h) => h.section === section && h.result === "missed").length;
  const lrMissed = (section: LRSectionReading) =>
    section.rows.filter((row) => isMissed(row.result)).length + hiddenMissed(section.section);
  return {
    ok: true,
    result: {
      prepTest: expected,
      sections: sections.map((section): PracticeTestSection => section.kind === "RC"
        ? { section: section.section, kind: "RC", score: section.score, missed: Math.abs(section.score) }
        : { section: section.section, kind: "LR", score: section.score, missed: lrMissed(section), rows: section.rows }),
      hiddenResults,
      missedStemTypes: types,
      missedQuestions: lrSections.reduce((total, section) => total + lrMissed(section), 0),
      missedStemTypeCounts: Object.fromEntries(types.map(({ type, misses }) => [type, misses.length])),
    },
  };
}
