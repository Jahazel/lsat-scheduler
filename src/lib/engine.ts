import type {
  Activity,
  AnalyticsSnapshot,
  DayOfWeek,
  DayPlan,
  LRActivity,
  LRType,
  RCActivity,
  RCType,
  RulesConfig,
  Student,
  WeeklySchedule,
} from "./types";

export const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DRILL_DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"];

// Generous — far more laps than any realistic week could consume. The list
// only needs to be "long enough"; the day-by-day fill decides how much of
// it actually gets used.
const LAPS = 6;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function reviewPercent(score: number, rules: RulesConfig): number {
  if (score < 160) return rules.reviewPercentByBand.below160;
  if (score < 170) return rules.reviewPercentByBand.mid;
  return rules.reviewPercentByBand.above170;
}

// Score boundary goes to the higher band — same convention as the 160/170
// review-percent bands elsewhere in the rules.
function isHigherLRBand(score: number, rules: RulesConfig): boolean {
  return score >= rules.lrDifficultyCutoffScore;
}

interface LRCandidate {
  type: LRType;
  questionCount: number;
  difficultyRange: string;
}

interface RCCandidate {
  type: RCType;
  passageCount: number;
  difficultyLevel: number;
}

function buildLRList(analytics: AnalyticsSnapshot, rules: RulesConfig): LRCandidate[] {
  const list: LRCandidate[] = [];
  const higherBand = isHigherLRBand(analytics.currentScore, rules);

  // Per Patrick: above the cutoff, every appearance of a type is L3-5.
  // Below the cutoff, a type's first appearance THAT WEEK is L2-4; every
  // appearance after that (same type, same week) is L3-5. Tracked here by
  // how many times each type has already been pushed onto the list, since
  // list order is the order the week actually plays out in.
  const occurrences = new Map<LRType, number>();
  function nextDifficulty(type: LRType): string {
    const seen = occurrences.get(type) ?? 0;
    occurrences.set(type, seen + 1);
    if (higherBand) return "L3-5";
    return seen === 0 ? "L2-4" : "L3-5";
  }

  // Mandatory floor — every starred type, smallest unit, before anything else.
  for (const type of rules.lrStarredTypes) {
    list.push({
      type,
      questionCount: rules.lrUnitSizes.small,
      difficultyRange: nextDifficulty(type),
    });
  }

  // Restricted Stimulus Logic types — only the ones flagged top-priority
  // this week. One appearance each, smallest unit, never part of the
  // repeating weakest-first cycle below.
  for (const type of analytics.lrTopPriorityLogicTypes) {
    list.push({
      type,
      questionCount: rules.lrUnitSizes.small,
      difficultyRange: nextDifficulty(type),
    });
  }

  // Weakest-first, ranked once from this week's snapshot — the "regular
  // pool" only: Question Stem types plus the 3 Stimulus Logic exceptions.
  // The other Stimulus Logic types never enter this ranking at all; they're
  // handled entirely by the top-priority block above. Walk the ranked list;
  // on reaching the bottom, loop back to the top and escalate size.
  const regularPool: LRType[] = [...rules.lrStemTypes, ...rules.lrLogicExceptions];
  const ranked = regularPool.sort(
    (a, b) => (analytics.lrAccuracyByType[a] ?? 1) - (analytics.lrAccuracyByType[b] ?? 1)
  );

  let usedFullSection = false;
  for (let lap = 0; lap < LAPS; lap++) {
    for (const type of ranked) {
      let questionCount: number;
      if (lap === 0) {
        questionCount = rules.lrUnitSizes.small;
      } else if (lap === 1) {
        questionCount = rules.lrUnitSizes.medium;
      } else if (!usedFullSection) {
        questionCount = rules.lrUnitSizes.fullSection;
        usedFullSection = true; // only one full section, ever, per week
      } else {
        questionCount = rules.lrUnitSizes.medium; // stay at the largest non-full size
      }
      list.push({ type, questionCount, difficultyRange: nextDifficulty(type) });
    }
  }

  return list;
}

function buildRCList(rules: RulesConfig): RCCandidate[] {
  const list: RCCandidate[] = [];
  const types = rules.rcTypes; // fixed order, length 5
  const n = types.length;

  let usedFullSection = false;
  for (let lap = 0; lap < LAPS; lap++) {
    for (let i = 0; i < n; i++) {
      const type = types[i];
      // Diagonal walk across the type x difficulty grid — even coverage of
      // both dimensions, independent of score.
      const difficultyLevel = ((i + lap) % 5) + 1;
      let passageCount: number;
      if (lap === 0) {
        passageCount = rules.rcUnitSizes.small;
      } else if (lap === 1) {
        passageCount = rules.rcUnitSizes.medium;
      } else if (!usedFullSection) {
        passageCount = rules.rcUnitSizes.fullSection;
        usedFullSection = true;
      } else {
        passageCount = rules.rcUnitSizes.medium;
      }
      list.push({ type, passageCount, difficultyLevel });
    }
  }

  return list;
}

function lrDrillMinutes(c: LRCandidate, rules: RulesConfig, accommodation: number): number {
  return (c.questionCount * rules.lrQuestionSeconds * accommodation) / 60;
}

function rcDrillMinutes(c: RCCandidate, rules: RulesConfig, accommodation: number): number {
  return (c.passageCount * rules.rcPassageSeconds * accommodation) / 60;
}

function lrToActivity(
  c: LRCandidate,
  rules: RulesConfig,
  accommodation: number,
  reviewPct: number
): LRActivity {
  const drillMinutes = lrDrillMinutes(c, rules, accommodation);
  return {
    kind: "LR",
    type: c.type,
    questionCount: c.questionCount,
    difficultyRange: c.difficultyRange,
    drillMinutes: round1(drillMinutes),
    reviewMinutes: round1(drillMinutes * reviewPct),
  };
}

function rcToActivity(
  c: RCCandidate,
  rules: RulesConfig,
  accommodation: number,
  reviewPct: number
): RCActivity {
  const drillMinutes = rcDrillMinutes(c, rules, accommodation);
  return {
    kind: "RC",
    type: c.type,
    passageCount: c.passageCount,
    difficultyLevel: c.difficultyLevel,
    drillMinutes: round1(drillMinutes),
    reviewMinutes: round1(drillMinutes * reviewPct),
  };
}

interface FillResult {
  activities: Activity[];
  totalMinutes: number;
  nextLrIndex: number;
  nextRcIndex: number;
}

// Strict LR/RC alternation. Tries the next candidate in turn; the moment one
// doesn't fit, the day stops right there — nothing skipped, list pointers
// hold their place for the next day to continue from.
function fillDrillDay(
  lrList: LRCandidate[],
  lrIndex: number,
  rcList: RCCandidate[],
  rcIndex: number,
  capacityMinutes: number,
  rules: RulesConfig,
  accommodation: number,
  reviewPct: number
): FillResult {
  const activities: Activity[] = [];
  let totalMinutes = 0;
  let takeLR = true;

  while (lrIndex < lrList.length || rcIndex < rcList.length) {
    if (takeLR && lrIndex >= lrList.length) {
      takeLR = false;
      continue;
    }
    if (!takeLR && rcIndex >= rcList.length) {
      takeLR = true;
      continue;
    }

    if (takeLR) {
      const candidate = lrList[lrIndex];
      const drillMinutes = lrDrillMinutes(candidate, rules, accommodation);
      const cost = drillMinutes * (1 + reviewPct);
      if (totalMinutes + cost > capacityMinutes) break;
      activities.push(lrToActivity(candidate, rules, accommodation, reviewPct));
      totalMinutes += cost;
      lrIndex++;
    } else {
      const candidate = rcList[rcIndex];
      const drillMinutes = rcDrillMinutes(candidate, rules, accommodation);
      const cost = drillMinutes * (1 + reviewPct);
      if (totalMinutes + cost > capacityMinutes) break;
      activities.push(rcToActivity(candidate, rules, accommodation, reviewPct));
      totalMinutes += cost;
      rcIndex++;
    }
    takeLR = !takeLR;
  }

  return {
    activities,
    totalMinutes: round1(totalMinutes),
    nextLrIndex: lrIndex,
    nextRcIndex: rcIndex,
  };
}

export function generateWeek(
  student: Student,
  analytics: AnalyticsSnapshot,
  rules: RulesConfig
): WeeklySchedule {
  const reviewPct = reviewPercent(analytics.currentScore, rules);

  const lrList = buildLRList(analytics, rules);
  const rcList = buildRCList(rules);

  const days = {} as Record<DayOfWeek, DayPlan>;
  const capacityMinutes = student.weekdayHours * 60;

  let lrIndex = 0;
  let rcIndex = 0;
  for (const day of DRILL_DAYS) {
    const result = fillDrillDay(
      lrList,
      lrIndex,
      rcList,
      rcIndex,
      capacityMinutes,
      rules,
      student.accommodationMultiplier,
      reviewPct
    );
    days[day] = {
      day,
      type: "drill",
      activities: result.activities,
      totalMinutes: result.totalMinutes,
    };
    lrIndex = result.nextLrIndex;
    rcIndex = result.nextRcIndex;
  }

  days[rules.restDay] = {
    day: rules.restDay,
    type: "rest",
    activities: [],
    totalMinutes: 0,
  };

  const ptMinutes = round1(rules.ptDurationMinutes * student.accommodationMultiplier);
  days.SATURDAY = {
    day: "SATURDAY",
    type: "practice_test",
    activities: [
      { kind: "PT", label: `Practice Test (from PT ${rules.ptSourceCutoff}+)`, minutes: ptMinutes },
    ],
    totalMinutes: ptMinutes,
  };

  const weekendMinutes = round1(student.weekendHours * 60);
  days.SUNDAY = {
    day: "SUNDAY",
    type: "review",
    activities: [{ kind: "REVIEW", label: "PT Review + Blind Review", minutes: weekendMinutes }],
    totalMinutes: weekendMinutes,
  };

  return { studentName: student.name, weekOf: analytics.weekOf, days };
}
