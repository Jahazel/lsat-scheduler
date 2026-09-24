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

const SECOND_TEST_DAY: Record<DayOfWeek, DayOfWeek> = {
  MONDAY: "THURSDAY",
  TUESDAY: "FRIDAY",
  WEDNESDAY: "SATURDAY",
  THURSDAY: "MONDAY",
  FRIDAY: "TUESDAY",
  SATURDAY: "WEDNESDAY",
  SUNDAY: "THURSDAY",
};

function nearTestWeek(weekOf: string, goalTestDate: string): boolean {
  const goal = new Date(`${goalTestDate}T00:00:00.000Z`);
  const monthBefore = new Date(goal);
  monthBefore.setUTCMonth(monthBefore.getUTCMonth() - 1);
  return weekOf >= monthBefore.toISOString().slice(0, 10) && weekOf < goalTestDate;
}

export interface WeekShapeOptions {
  createdOn?: DayOfWeek;
  carryOverReviewMinutes?: number;
}

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
  // A full-section drill runs the real section length (flat), not
  // questionCount × the per-question drilling rate.
  isFullSection: boolean;
}

interface RCCandidate {
  type: RCType;
  passageCount: number;
  difficultyLevel: number;
  // A full-section drill runs the real section length (flat), split evenly
  // across its exploded single-passage candidates — not passageCount × the
  // per-passage drilling rate.
  isFullSection: boolean;
}

// A student's accommodation category (their actual extra-time %) is not the
// multiplier applied to scheduled block lengths — see RulesConfig.
function timeMultiplierFor(rules: RulesConfig, student: Student): number {
  return rules.accommodationTimeMultiplier[student.accommodationMultiplier];
}

// Deterministic per-week coin flip — one full section total per week,
// alternating which subject (LR or RC) gets it based on the week's own
// date string, so it isn't the same subject every single week.
function weekPrefersLRFullSection(weekOf: string): boolean {
  let sum = 0;
  for (let i = 0; i < weekOf.length; i++) sum += weekOf.charCodeAt(i);
  return sum % 2 === 0;
}

function buildLRList(
  score: number,
  analytics: AnalyticsSnapshot,
  rules: RulesConfig,
  allowFullSection: boolean
): LRCandidate[] {
  const list: LRCandidate[] = [];
  const higherBand = isHigherLRBand(score, rules);

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
      isFullSection: false,
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
      isFullSection: false,
    });
  }

  // A type's designated drill partner, if it has one — 10-question drills
  // for paired types split 5+5 across both instead of running 10 of just
  // the one type.
  function pairPartner(type: LRType): LRType | undefined {
    const pair = rules.lrPairedTypes.find(([a, b]) => a === type || b === type);
    if (!pair) return undefined;
    return pair[0] === type ? pair[1] : pair[0];
  }

  // Weakest-first, ranked once from this week's snapshot — the "regular
  // pool" only: Question Stem types plus the 3 Stimulus Logic exceptions.
  // The other Stimulus Logic types never enter this ranking at all; they're
  // handled entirely by the top-priority block above. Walk the ranked list;
  // on reaching the bottom, loop back to the top and escalate size.
  const regularPool: LRType[] = [...rules.lrStemTypes, ...rules.lrLogicExceptions].filter(
    (type) => analytics.lrAccuracyByType[type] !== undefined
  );
  const ranked = regularPool.sort(
    (a, b) => (analytics.lrAccuracyByType[a] ?? 1) - (analytics.lrAccuracyByType[b] ?? 1)
  );

  // The week's one full section (LR or RC, decided one level up) goes right
  // after the mandatory floor — on the single weakest type — rather than
  // waiting for the escalating loop below to reach a "full section" tier
  // that a normal week's capacity never actually gets deep enough to touch.
  const weakestType = ranked[0];
  if (allowFullSection && weakestType) {
    list.push({
      type: weakestType,
      questionCount: rules.lrUnitSizes.fullSection,
      difficultyRange: nextDifficulty(weakestType),
      isFullSection: true,
    });
  }

  for (let lap = 0; lap < LAPS; lap++) {
    for (const type of ranked) {
      const questionCount = lap === 0 ? rules.lrUnitSizes.small : rules.lrUnitSizes.medium;

      // Every medium (10-question) tier splits 5+5 across a paired type's
      // partner instead of running 10 of just the one type.
      if (questionCount === rules.lrUnitSizes.medium) {
        const partner = pairPartner(type);
        if (partner) {
          list.push({
            type,
            questionCount: rules.lrUnitSizes.small,
            difficultyRange: nextDifficulty(type),
            isFullSection: false,
          });
          list.push({
            type: partner,
            questionCount: rules.lrUnitSizes.small,
            difficultyRange: nextDifficulty(partner),
            isFullSection: false,
          });
          continue;
        }
      }

      list.push({ type, questionCount, difficultyRange: nextDifficulty(type), isFullSection: false });
    }
  }

  return list;
}

function buildRCList(rules: RulesConfig, allowFullSection: boolean): RCCandidate[] {
  const list: RCCandidate[] = [];
  const types = rules.rcTypes; // fixed order, length 5
  const n = types.length;

  // Advances once per single passage pushed, across the whole function
  // (never reset per lap or per tier). Since it strictly increments by 1
  // every time, two consecutive passages never land on the same type index
  // — true within a multi-passage tier, and true across a tier or lap
  // boundary too, which a per-position walk didn't guarantee. Doubles as
  // the difficulty cycle for non-paired tiers (L2-L5, excluding L1).
  let cursor = 0;
  // Advances once per 2-passage tier (not per passage) so the fixed combos
  // cycle in order across the week instead of repeating the same one.
  let comboIndex = 0;

  // The week's one full section (LR or RC, decided one level up) goes in as
  // a single atomic candidate — one sitting, never split across days —
  // right at the front, rather than waiting for the escalating loop below
  // to reach a "full section" tier that a normal week's capacity never
  // actually gets deep enough to touch. A real section spans every type, so
  // the type/difficultyLevel here are placeholders never shown — it renders
  // as its own "Full RC Section" summary line, not a per-type breakdown.
  if (allowFullSection) {
    list.push({
      type: types[0],
      passageCount: rules.rcUnitSizes.fullSection,
      difficultyLevel: 2,
      isFullSection: true,
    });
  }

  for (let lap = 0; lap < LAPS; lap++) {
    for (let i = 0; i < n; i++) {
      // How many passages this tier's pick is worth — 1 on the first pass,
      // 2 every pass after that.
      const passageCount = lap === 0 ? rules.rcUnitSizes.small : rules.rcUnitSizes.medium;

      // A 2-passage tier uses one of the fixed [lower, higher] combos
      // instead of the general cycle, so both slots are filled up front.
      const combo =
        passageCount === rules.rcUnitSizes.medium
          ? rules.rcTwoPassageDifficultyCombos[comboIndex++ % rules.rcTwoPassageDifficultyCombos.length]
          : undefined;

      // Every passage is its own candidate (passageCount always 1 on the
      // way out) so a multi-passage tier never repeats the same type and
      // difficulty back to back.
      for (let j = 0; j < passageCount; j++) {
        const typeIndex = cursor % n;
        const difficultyLevel = combo ? combo[j] : (cursor % 4) + 2; // L2-L5, never L1
        list.push({ type: types[typeIndex], passageCount: 1, difficultyLevel, isFullSection: false });
        cursor++;
      }
    }
  }

  return list;
}

function lrDrillMinutes(c: LRCandidate, rules: RulesConfig, accommodation: number): number {
  if (c.isFullSection) return rules.fullSectionMinutes * accommodation;
  return (c.questionCount * rules.lrQuestionSeconds * accommodation) / 60;
}

function rcDrillMinutes(c: RCCandidate, rules: RulesConfig, accommodation: number): number {
  // Per spec: regular RC passage drilling is NOT accommodation-scaled —
  // only LR questions and full sections are. Asymmetric, but that's the
  // stated rule.
  if (c.isFullSection) return rules.fullSectionMinutes * accommodation;
  return (c.passageCount * rules.rcPassageSeconds) / 60;
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
    isFullSection: c.isFullSection,
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
    isFullSection: c.isFullSection,
  };
}

interface FillResult {
  activities: Activity[];
  totalMinutes: number;
  nextLrIndex: number;
  nextRcIndex: number;
  nextLrQuestionsSoFar: number;
  nextRcPassagesSoFar: number;
}

// "For every 20 LR questions, 2 RC passages is a good rule of thumb" — RC
// drilling should trail LR at 1/10th the pace, measured in questions vs.
// passages (not raw drill time), and tracked cumulatively across the whole
// week (not reset per day) so the week's overall total lands close to that
// ratio rather than each day chasing it independently.
const LR_QUESTIONS_PER_RC_PASSAGE = 10;

interface SideFill<T> {
  taken: T[];
  used: number;
  nextIndex: number;
}

// Greedily takes items in order while they fit under `target`. An
// indivisible item that would exceed the remaining capacity is omitted.
function fillSideToTarget<T>(
  list: T[],
  startIndex: number,
  cost: (c: T) => number,
  target: number
): SideFill<T> {
  const taken: T[] = [];
  let idx = startIndex;
  let used = 0;
  while (idx < list.length && used + cost(list[idx]) <= target) {
    taken.push(list[idx]);
    used += cost(list[idx]);
    idx++;
  }
  return { taken, used, nextIndex: idx };
}

// Keeps LR and RC drilling at roughly a 20-questions-to-2-passages pace,
// tracked across the whole week rather than reset per day: whichever side
// is further behind that pace always gets the next turn (ties favor LR,
// since LR is meant to generally lead), and the moment the favored side's
// next candidate doesn't fit what's left of the day, the fill stops
// outright — it does NOT let the other side take the turn instead. That
// fallback is what used to let RC run away with a whole day whenever LR got
// stuck behind a big pending item (e.g. the day right before the week's
// full section, where LR's next item is the section itself and never fits
// until it has the day to itself); stopping there keeps the pace intact, at
// the cost of occasionally landing a day under capacity — the accepted
// trade, since the pace ratio is what's being optimized for, not squeezing
// out every last capacity minute.
//
// The week's one full section is the exception to pace-tracking: a real
// section is a single sitting expected to dominate whichever day it lands
// on, so it's taken first (unconditionally, capacity permitting) and the
// OTHER side then just fills whatever room is left on its own, using the
// day's normal capacity-tolerance closing step since there's no pace to
// stay behind. That side's items still count toward its running pace
// total for the rest of the week, though — it's still regular drilling.
//
// Output is grouped LR block then RC block (order set by lrFirst — see
// generateWeek, which alternates it day to day), not interleaved.
function fillDrillDay(
  lrList: LRCandidate[],
  lrIndex: number,
  rcList: RCCandidate[],
  rcIndex: number,
  capacityMinutes: number,
  rules: RulesConfig,
  accommodation: number,
  reviewPct: number,
  lrFirst: boolean,
  lrQuestionsSoFar: number,
  rcPassagesSoFar: number
): FillResult {
  const lrCost = (c: LRCandidate) => lrDrillMinutes(c, rules, accommodation) * (1 + reviewPct);
  const rcCost = (c: RCCandidate) => rcDrillMinutes(c, rules, accommodation) * (1 + reviewPct);

  let lrTaken: LRCandidate[] = [];
  let rcTaken: RCCandidate[] = [];
  let li = lrIndex;
  let ri = rcIndex;
  let lrUsed = 0;
  let rcUsed = 0;
  let lrQuestions = lrQuestionsSoFar;
  let rcPassages = rcPassagesSoFar;

  const lrNextIsFullSection = li < lrList.length && lrList[li].isFullSection && lrCost(lrList[li]) <= capacityMinutes;
  const rcNextIsFullSection = ri < rcList.length && rcList[ri].isFullSection && rcCost(rcList[ri]) <= capacityMinutes;

  if (lrNextIsFullSection) {
    lrTaken = [lrList[li]];
    lrUsed = lrCost(lrList[li]);
    li++;
    const rcFill = fillSideToTarget(rcList, ri, rcCost, capacityMinutes - lrUsed);
    rcTaken = rcFill.taken;
    rcUsed = rcFill.used;
    ri = rcFill.nextIndex;
    rcPassages += rcTaken.reduce((sum, c) => sum + c.passageCount, 0);
  } else if (rcNextIsFullSection) {
    rcTaken = [rcList[ri]];
    rcUsed = rcCost(rcList[ri]);
    ri++;
    const lrFill = fillSideToTarget(lrList, li, lrCost, capacityMinutes - rcUsed);
    lrTaken = lrFill.taken;
    lrUsed = lrFill.used;
    li = lrFill.nextIndex;
    lrQuestions += lrTaken.reduce((sum, c) => sum + c.questionCount, 0);
  } else {
    for (;;) {
      const lrTurn = lrQuestions <= rcPassages * LR_QUESTIONS_PER_RC_PASSAGE;
      if (lrTurn) {
        if (li >= lrList.length) break;
        const cost = lrCost(lrList[li]);
        if (lrUsed + rcUsed + cost > capacityMinutes) break;
        lrTaken.push(lrList[li]);
        lrUsed += cost;
        lrQuestions += lrList[li].questionCount;
        li++;
      } else {
        if (ri >= rcList.length) break;
        const cost = rcCost(rcList[ri]);
        if (lrUsed + rcUsed + cost > capacityMinutes) break;
        rcTaken.push(rcList[ri]);
        rcUsed += cost;
        rcPassages += rcList[ri].passageCount;
        ri++;
      }
    }

    // Capacity is a hard cap for every drill. Indivisible work that does
    // not fit is left for a later day instead of exceeding the student's
    // stated daily capacity.
  }

  const lrActivities = lrTaken.map((c) => lrToActivity(c, rules, accommodation, reviewPct));
  const rcActivities = rcTaken.map((c) => rcToActivity(c, rules, accommodation, reviewPct));
  const orderedActivities = lrFirst ? [...lrActivities, ...rcActivities] : [...rcActivities, ...lrActivities];

  return {
    activities: orderedActivities,
    // Planned time includes both drilling and its assigned review, matching
    // the capacity used when selecting each indivisible activity.
    totalMinutes: round1(lrUsed + rcUsed),
    nextLrIndex: li,
    nextRcIndex: ri,
    nextLrQuestionsSoFar: lrQuestions,
    nextRcPassagesSoFar: rcPassages,
  };
}

export function generateWeek(
  student: Student,
  analytics: AnalyticsSnapshot,
  rules: RulesConfig,
  studentName: string,
  options: WeekShapeOptions = {}
): WeeklySchedule {
  const reviewPct = reviewPercent(student.currentScore, rules);
  const timeMult = timeMultiplierFor(rules, student);
  const isNearTestWeek = nearTestWeek(analytics.weekOf, student.goalTestDate);
  const lrGetsFullSection = weekPrefersLRFullSection(analytics.weekOf);

  const lrList = buildLRList(student.currentScore, analytics, rules, lrGetsFullSection);
  const rcList = buildRCList(rules, !lrGetsFullSection);

  const days = {} as Record<DayOfWeek, DayPlan>;
  const preferred = student.preferredPracticeTestDay;
  const createdIndex = DAY_ORDER.indexOf(options.createdOn ?? "MONDAY");
  const plannedTestDays = [preferred, ...(isNearTestWeek ? [SECOND_TEST_DAY[preferred]] : [])];
  const carryOverReview = options.carryOverReviewMinutes !== undefined;
  // A saved Sunday test owns Monday, even if it displaces this week's test.
  const shapeTestDays = carryOverReview ? plannedTestDays.filter((day) => day !== "MONDAY") : plannedTestDays;
  const reviewDayFor = (day: DayOfWeek) => (day === "SUNDAY" ? undefined : DAY_ORDER[DAY_ORDER.indexOf(day) + 1]);
  // The rest day keeps the day the full shape gives it, even when that day has passed.
  const shapeReviewDays = shapeTestDays.flatMap((day) => reviewDayFor(day) ?? []);
  const restDay = shapeTestDays.includes("WEDNESDAY") ? "TUESDAY"
    : shapeReviewDays.includes("WEDNESDAY") ? "MONDAY"
    : rules.restDay;
  // A test whose day has passed is dropped together with its review day.
  const testDays = shapeTestDays.filter((day) => DAY_ORDER.indexOf(day) >= createdIndex);
  const reviewDays = testDays.flatMap((day) => reviewDayFor(day) ?? []);
  const occupied = new Set<DayOfWeek>([...testDays, ...reviewDays, ...(carryOverReview ? ["MONDAY" as const] : [])]);
  // If Monday's earned review displaces rest, use the first free day.
  const actualRestDay = occupied.has(restDay)
    ? DAY_ORDER.find((day) => !occupied.has(day)) ?? restDay
    : restDay;
  const drillDays = DAY_ORDER.filter((day) => day !== actualRestDay && !occupied.has(day));

  let lrIndex = 0;
  let rcIndex = 0;
  let lrQuestionsSoFar = 0;
  let rcPassagesSoFar = 0;
  drillDays.forEach((day, i) => {
    // Alternate which block leads across the actual drilling days.
    const lrFirst = i % 2 === 1;
    const result = fillDrillDay(
      lrList,
      lrIndex,
      rcList,
      rcIndex,
      student.dailyCapacityMinutes[day],
      rules,
      timeMult,
      reviewPct,
      lrFirst,
      lrQuestionsSoFar,
      rcPassagesSoFar
    );
    days[day] = {
      day,
      type: "drill",
      activities: result.activities,
      totalMinutes: result.totalMinutes,
    };
    lrIndex = result.nextLrIndex;
    rcIndex = result.nextRcIndex;
    lrQuestionsSoFar = result.nextLrQuestionsSoFar;
    rcPassagesSoFar = result.nextRcPassagesSoFar;
  });

  days[actualRestDay] = {
    day: actualRestDay,
    type: "rest",
    activities: [],
    totalMinutes: 0,
  };

  const ptMinutes = round1(rules.ptDurationMinutes * timeMult);
  for (const day of testDays) {
    days[day] = {
      day, type: "practice_test",
      activities: [{ kind: "PT", label: isNearTestWeek
        ? "LawHub Practice Test"
        : `Practice Test (from PT ${rules.ptSourceCutoff}+)`, minutes: ptMinutes }],
      totalMinutes: ptMinutes,
      capacityOverageMinutes: Math.max(0, ptMinutes - student.dailyCapacityMinutes[day]),
    };
  }

  function setReviewDay(day: DayOfWeek, minutes: number) {
    days[day] = {
      day, type: "review",
      activities: [{ kind: "REVIEW", label: "PT Review + Blind Review", minutes }],
      totalMinutes: minutes,
      capacityOverageMinutes: Math.max(0, minutes - student.dailyCapacityMinutes[day]),
    };
  }
  for (const day of reviewDays) setReviewDay(day, ptMinutes);
  if (carryOverReview) setReviewDay("MONDAY", options.carryOverReviewMinutes!);

  return { studentName, weekOf: analytics.weekOf, days };
}
