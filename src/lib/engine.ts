import type {
  Activity, AnalyticsSnapshot, DayOfWeek, DayPlan, LRActivity, LRDrill, LRStemType, LRType,
  RCActivity, RCDrill, RCType, RulesConfig, ScheduleReason, Student, WeeklySchedule,
} from "./types";
import {
  dateInWeek, fullSectionDroppedSentence, isoDateInWeek, missedTypePrioritySentence, nearTestWeekSentence,
  noPracticeTestSentence, restDayMovedSentence, reviewCarriedOverSentence,
  starredRotationSentence, practiceTestReviewDayNextWeekSentence,
} from "./scheduleReasonText";
import type { RestDayMoveCase } from "./scheduleReasonText";

export const DAY_ORDER: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

const SECOND_PRACTICE_TEST_DAY: Record<DayOfWeek, DayOfWeek> = {
  MONDAY: "THURSDAY", TUESDAY: "FRIDAY", WEDNESDAY: "SATURDAY",
  THURSDAY: "MONDAY", FRIDAY: "TUESDAY", SATURDAY: "WEDNESDAY", SUNDAY: "THURSDAY",
};

function nearTestWeek(weekOf: string, goalTestDate: string): boolean {
  const goal = new Date(`${goalTestDate}T00:00:00.000Z`);
  const monthBefore = new Date(goal);
  monthBefore.setUTCMonth(monthBefore.getUTCMonth() - 1);
  return weekOf >= monthBefore.toISOString().slice(0, 10) && weekOf < goalTestDate;
}

export interface WeekShapeOptions {
  createdOn?: DayOfWeek;
  priorWeekPracticeTestReviewMinutes?: number;
  priorSchedules?: WeeklySchedule[];
  /** Missed stem-type counts from the practice-test result approved for this week. */
  missedStemTypeCounts?: Partial<Record<LRStemType, number>>;
}

const FILL_WINDOW_OVER_MINUTES = 30;
const PAIRED_LINES_SCORE_CUTOFF = 160;

function round2(n: number): number { return Math.round(n * 100) / 100; }
function multiplier(rules: RulesConfig, student: Student): number {
  return rules.accommodationTimeMultiplier[student.accommodationMultiplier];
}

function recentTypeWeek(type: LRType, history: WeeklySchedule[]): string {
  return history.filter((schedule) => DAY_ORDER.some((day) => schedule.days[day].activities.some(
    (activity) => activity.kind === "LR" && !activity.isFullSection && activity.types.includes(type)
  ))).map((schedule) => schedule.weekOf).sort().at(-1) ?? "";
}

function lrWeakness(analytics: AnalyticsSnapshot, rules: RulesConfig) {
  const listOrder = [...rules.lrStemTypes, ...rules.lrLogicTypes];
  return (a: LRType, b: LRType) =>
    (analytics.lrAccuracyByType[a] ?? 1) - (analytics.lrAccuracyByType[b] ?? 1)
    || listOrder.indexOf(a) - listOrder.indexOf(b);
}

export function mostMissedType(counts: WeekShapeOptions["missedStemTypeCounts"], analytics: AnalyticsSnapshot,
  rules: RulesConfig): LRStemType | undefined {
  const weakness = lrWeakness(analytics, rules);
  const count = (type: LRStemType) => counts?.[type] ?? 0;
  return rules.lrStemTypes.filter((type) => count(type) > 0)
    .sort((a, b) => count(b) - count(a) || weakness(a, b))[0];
}

function lrTypeOrder(analytics: AnalyticsSnapshot, rules: RulesConfig, history: WeeklySchedule[], rotate: boolean,
  missedType: LRStemType | undefined): LRType[] {
  const weakness = lrWeakness(analytics, rules);
  const starred = [...rules.lrStarredTypes].sort((a, b) =>
    rotate ? recentTypeWeek(a, history).localeCompare(recentTypeWeek(b, history)) || weakness(a, b) : weakness(a, b));
  const regular = rotate ? [] : [...rules.lrStemTypes, ...rules.lrLogicExceptions]
    .filter((type) => analytics.lrAccuracyByType[type] !== undefined && !starred.includes(type))
    .sort(weakness);
  const topPriority = rotate ? [] : analytics.lrTopPriorityLogicTypes.filter((type) => !starred.includes(type));
  const order = [...starred, ...topPriority, ...regular];
  return missedType ? [missedType, ...order.filter((type) => type !== missedType)] : order;
}

function rcTypeOrder(analytics: AnalyticsSnapshot, rules: RulesConfig): RCType[] {
  const accuracy = analytics.rcAccuracyByType ?? {};
  return [...rules.rcTypes].sort((a, b) =>
    Number(accuracy[a] === undefined) - Number(accuracy[b] === undefined)
    || (accuracy[a] ?? 0) - (accuracy[b] ?? 0)
    || rules.rcTypes.indexOf(a) - rules.rcTypes.indexOf(b));
}

type LRUnit = Pick<LRDrill, "types" | "questionCount" | "difficultyRange">;

function pairedUnit(order: LRType[], score: number, rules: RulesConfig): LRUnit | undefined {
  for (const type of order) {
    const pair = rules.lrPairedTypes.find((candidate) => candidate.includes(type));
    if (pair) return { types: [type, pair[0] === type ? pair[1] : pair[0]], questionCount: rules.lrUnitSizes.medium,
      difficultyRange: score >= rules.lrDifficultyCutoffScore ? "L3-5" : "L2-4" };
  }
}

interface DrillStream {
  lrOrder: LRType[];
  rcOrder: RCType[];
  lrIndex: number;
  rcIndex: number;
  rcComboIndex: number;
  lrQuestions: number;
  rcPassages: number;
}

function nextLRUnit(stream: DrillStream, score: number, rules: RulesConfig): LRUnit {
  const firstPass = stream.lrIndex < stream.lrOrder.length;
  return { types: [stream.lrOrder[stream.lrIndex % stream.lrOrder.length]],
    questionCount: firstPass ? rules.lrUnitSizes.small : rules.lrUnitSizes.medium,
    difficultyRange: score >= rules.lrDifficultyCutoffScore || !firstPass ? "L3-5" : "L2-4" };
}

function takeRCPassages(stream: DrillStream, count: 1 | 2, rules: RulesConfig): RCDrill["passages"] {
  const typeAt = (offset: number) => stream.rcOrder[(stream.rcIndex + offset) % stream.rcOrder.length];
  let passages: RCDrill["passages"];
  if (count === 1) {
    passages = [{ type: typeAt(0), difficultyLevel: stream.rcIndex % 4 + 2 }];
  } else {
    const [lower, higher] = rules.rcTwoPassageDifficultyCombos[
      stream.rcComboIndex++ % rules.rcTwoPassageDifficultyCombos.length];
    passages = [{ type: typeAt(0), difficultyLevel: lower }, { type: typeAt(1), difficultyLevel: higher }];
  }
  stream.rcIndex += count;
  stream.rcPassages += count;
  return passages;
}

function fillDrillDay(stream: DrillStream, capacity: number, score: number, rules: RulesConfig, timeMult: number,
  lrFirst: boolean, fullSection: Activity | undefined, paired: LRUnit | undefined
): { activities: Activity[]; totalMinutes: number; placedPair: boolean } {
  const lr: LRActivity[] = [];
  const rc: RCActivity[] = [];
  const lrMinutes = (questions: number) => round2(questions * rules.lrQuestionSeconds * timeMult / 60);
  const rcMinutes = (passages: number) => round2(passages * rules.rcPassageSeconds * timeMult / 60);
  let used = 0;
  const fits = (minutes: number) => used + minutes <= capacity + FILL_WINDOW_OVER_MINUTES + 1e-8;
  const addLR = (unit: LRUnit) => {
    const minutes = lrMinutes(unit.questionCount);
    lr.push({ kind: "LR", ...unit, drillMinutes: minutes, isFullSection: false });
    used += minutes;
    stream.lrQuestions += unit.questionCount;
  };
  const takeLR = (questionCount?: number) => {
    const unit = nextLRUnit(stream, score, rules);
    stream.lrIndex++;
    addLR(questionCount ? { ...unit, questionCount } : unit);
  };
  const takeRC = (count: 1 | 2) => {
    rc.push({ kind: "RC", passages: takeRCPassages(stream, count, rules), drillMinutes: rcMinutes(count),
      isFullSection: false });
    used += rcMinutes(count);
  };
  const preferLR = () => stream.lrQuestions <= stream.rcPassages * 10;

  let placedPair = false;
  const pairMinutes = paired ? lrMinutes(paired.questionCount) : 0;
  const pairKeepsTopTypeFirst = () => stream.lrIndex > 0 || paired?.types[0] === stream.lrOrder[0];
  const pairReady = () => paired !== undefined && !placedPair && pairKeepsTopTypeFirst();
  const placePair = () => {
    if (!paired || !pairReady() || !fits(pairMinutes)) return;
    addLR(paired);
    placedPair = true;
  };

  if (fullSection?.kind === "LR") lr.push(fullSection);
  if (fullSection?.kind === "RC") rc.push(fullSection);
  if (fullSection?.kind === "LR" || fullSection?.kind === "RC") used += fullSection.drillMinutes;
  else {
    const minimumMinutes = preferLR() ? lrMinutes(nextLRUnit(stream, score, rules).questionCount) : rcMinutes(1);
    if (pairReady() && !fits(minimumMinutes + pairMinutes)) placePair();
    if (!placedPair && preferLR()) takeLR();
    else if (!placedPair) takeRC(1);
  }
  placePair();
  while (used < capacity - 1e-8) {
    const lrFits = fits(lrMinutes(nextLRUnit(stream, score, rules).questionCount));
    const rcFits = fits(rcMinutes(2));
    if (lrFits && (preferLR() || !rcFits)) takeLR();
    else if (rcFits) takeRC(2);
    else if (fits(lrMinutes(rules.lrUnitSizes.small))) takeLR(rules.lrUnitSizes.small);
    else break;
    placePair();
  }
  const activities = lrFirst ? [...lr, ...rc] : [...rc, ...lr];
  return { activities, totalMinutes: round2(activities.reduce((total, activity) =>
    total + activity.drillMinutes, 0)), placedPair };
}

function latestFullSection(history: WeeklySchedule[]): "LR" | "RC" | undefined {
  for (const schedule of [...history].sort((a, b) => b.weekOf.localeCompare(a.weekOf))) {
    for (const day of [...DAY_ORDER].reverse()) {
      const activity = schedule.days[day].activities.find((item) =>
        (item.kind === "LR" || item.kind === "RC") && item.isFullSection);
      if (activity?.kind === "LR" || activity?.kind === "RC") return activity.kind;
    }
  }
}

function fullSectionActivity(subject: "LR" | "RC", rules: RulesConfig, timeMult: number): Activity {
  return { kind: subject, drillMinutes: round2(rules.fullSectionMinutes * timeMult), isFullSection: true };
}

export function generateWeek(
  student: Student,
  analytics: AnalyticsSnapshot,
  rules: RulesConfig,
  studentName: string,
  options: WeekShapeOptions = {}
): WeeklySchedule {
  const timeMult = multiplier(rules, student);
  const isNearTestWeek = nearTestWeek(analytics.weekOf, student.goalTestDate);
  const reasons: ScheduleReason[] = [];
  const weekReason = (code: ScheduleReason["code"], sentence: string) =>
    reasons.push({ code, placement: { scope: "week" }, sentence });
  const dayReason = (code: ScheduleReason["code"], day: DayOfWeek, sentence: string) =>
    reasons.push({ code, placement: { scope: "day", day }, sentence });

  const days = {} as Record<DayOfWeek, DayPlan>;
  const preferredPracticeTestDay = student.preferredPracticeTestDay;
  const createdIndex = DAY_ORDER.indexOf(options.createdOn ?? "MONDAY");
  const priorWeekPracticeTestReviewMinutes = options.priorWeekPracticeTestReviewMinutes;
  const hasPriorWeekPracticeTestReview = priorWeekPracticeTestReviewMinutes !== undefined;
  // A prior-week Sunday practice test reserves Monday for its practice-test review day.
  // Use Tuesday's shape when Monday is the preferred practice-test day.
  const effectivePreferredPracticeTestDay = hasPriorWeekPracticeTestReview && preferredPracticeTestDay === "MONDAY"
    ? "TUESDAY" : preferredPracticeTestDay;
  const fullWeekPracticeTestDays = [effectivePreferredPracticeTestDay,
    ...(isNearTestWeek ? [SECOND_PRACTICE_TEST_DAY[effectivePreferredPracticeTestDay]] : [])];
  const plannedPracticeTestDays = hasPriorWeekPracticeTestReview
    ? fullWeekPracticeTestDays.filter((day) => day !== "MONDAY")
    : fullWeekPracticeTestDays;
  const practiceTestReviewDayFor = (day: DayOfWeek) =>
    (day === "SUNDAY" ? undefined : DAY_ORDER[DAY_ORDER.indexOf(day) + 1]);
  // The rest day keeps the day the full weekly shape gives it, even when that day has passed.
  const plannedPracticeTestReviewDays = plannedPracticeTestDays.flatMap((day) => practiceTestReviewDayFor(day) ?? []);
  const computedRestDay = plannedPracticeTestDays.includes("WEDNESDAY") ? "TUESDAY"
    : plannedPracticeTestReviewDays.includes("WEDNESDAY") ? "MONDAY"
    : rules.restDay;
  // Once the effective preferred practice-test day has passed, the week has no practice tests or review days.
  const scheduledPracticeTestDays = createdIndex > DAY_ORDER.indexOf(effectivePreferredPracticeTestDay)
    ? []
    : plannedPracticeTestDays.filter((day) => DAY_ORDER.indexOf(day) >= createdIndex);
  const scheduledPracticeTestReviewDays = scheduledPracticeTestDays.flatMap((day) => practiceTestReviewDayFor(day) ?? []);
  if (isNearTestWeek && scheduledPracticeTestDays.length > 0) {
    const count = scheduledPracticeTestDays.length;
    const allBeforeGoal = scheduledPracticeTestDays.every((day) =>
      isoDateInWeek(analytics.weekOf, DAY_ORDER.indexOf(day)) < student.goalTestDate);
    weekReason("near_test_week", nearTestWeekSentence(count,
      allBeforeGoal ? student.goalTestDate : undefined));
  }
  if (scheduledPracticeTestDays.length === 0) {
    const nextWeekOf = isoDateInWeek(analytics.weekOf, 7);
    const nextWeekDays = [preferredPracticeTestDay,
      ...(nearTestWeek(nextWeekOf, student.goalTestDate)
        ? [SECOND_PRACTICE_TEST_DAY[preferredPracticeTestDay]] : [])];
    const firstDayIndex = Math.min(...nextWeekDays.map((day) => DAY_ORDER.indexOf(day)));
    weekReason("no_practice_test", noPracticeTestSentence(isoDateInWeek(nextWeekOf, firstDayIndex) >= student.goalTestDate
      ? undefined : dateInWeek(nextWeekOf, firstDayIndex)));
  }
  const occupied = new Set<DayOfWeek>([
    ...scheduledPracticeTestDays,
    ...scheduledPracticeTestReviewDays,
    ...(hasPriorWeekPracticeTestReview ? ["MONDAY" as const] : []),
  ]);
  // If the prior-week practice-test review displaces rest, use the first free day from creation onward.
  const restDay = occupied.has(computedRestDay)
    ? DAY_ORDER.slice(createdIndex).find((day) => !occupied.has(day)) ?? computedRestDay
    : computedRestDay;
  if (restDay !== rules.restDay) {
    const originalRestOccupiedBy = plannedPracticeTestDays.includes(rules.restDay) ? "practice test"
      : plannedPracticeTestReviewDays.includes(rules.restDay) || (rules.restDay === "MONDAY" && hasPriorWeekPracticeTestReview)
        ? "practice test review" : undefined;
    let moveCase: RestDayMoveCase = { kind: "schedule" };
    if (originalRestOccupiedBy !== undefined && occupied.has(rules.restDay)) {
      moveCase = { kind: "occupied", by: originalRestOccupiedBy };
    } else if (originalRestOccupiedBy !== undefined) {
      moveCase = { kind: "reserved", for: originalRestOccupiedBy };
    }
    dayReason("rest_day_moved", restDay, restDayMovedSentence(restDay, rules.restDay, moveCase));
  }
  const drillingDays = DAY_ORDER.filter((day) => day !== restDay && !occupied.has(day));

  const activeDrillingDays = drillingDays.filter((day) => DAY_ORDER.indexOf(day) >= createdIndex);
  const fullSectionDay = student.currentScore < 150 ? undefined : activeDrillingDays
    .filter((day) => student.dailyCapacityMinutes[day] >= 60)
    .sort((a, b) => student.dailyCapacityMinutes[b] - student.dailyCapacityMinutes[a]
      || DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))[0];
  if (!fullSectionDay) {
    weekReason("full_section_dropped", fullSectionDroppedSentence(
      student.currentScore < 150 ? { kind: "score", score: student.currentScore }
        : activeDrillingDays.length === 0 ? { kind: "no_drilling_day" } : { kind: "capacity" }));
  }
  const history = options.priorSchedules ?? [];
  const fullSubject = latestFullSection(history) === "LR" ? "RC" : "LR";
  const missedType = mostMissedType(options.missedStemTypeCounts, analytics, rules);
  if (missedType) weekReason("missed_type_priority", missedTypePrioritySentence(missedType));
  const pairedQuota = student.currentScore >= PAIRED_LINES_SCORE_CUTOFF ? 2 : 1;
  const fillWith = (rotate: boolean) => {
    const lrOrder = lrTypeOrder(analytics, rules, history, rotate, missedType);
    const paired = pairedUnit(lrOrder, student.currentScore, rules);
    const stream: DrillStream = { lrOrder, rcOrder: rcTypeOrder(analytics, rules),
      lrIndex: 0, rcIndex: 0, rcComboIndex: 0, lrQuestions: 0, rcPassages: 0 };
    const plans = {} as Partial<Record<DayOfWeek, DayPlan>>;
    let pairsPlaced = 0;
    activeDrillingDays.forEach((day) => {
      const full = day === fullSectionDay ? fullSectionActivity(fullSubject, rules, timeMult) : undefined;
      const result = fillDrillDay(stream, student.dailyCapacityMinutes[day], student.currentScore, rules, timeMult,
        drillingDays.indexOf(day) % 2 === 1, full, pairsPlaced < pairedQuota ? paired : undefined);
      if (result.placedPair) pairsPlaced++;
      plans[day] = { day, type: "drill", activities: result.activities,
        totalMinutes: result.totalMinutes,
        capacityOverageMinutes: Math.max(0, round2(result.totalMinutes - student.dailyCapacityMinutes[day])) };
    });
    const drilledTypes = new Set(Object.values(plans).flatMap((plan) => plan?.activities ?? [])
      .flatMap((activity) => activity.kind === "LR" && !activity.isFullSection ? activity.types : []));
    return { plans, sittingOut: rules.lrStarredTypes.filter((type) => !drilledTypes.has(type)),
      drilledAny: drilledTypes.size > 0 };
  };
  const firstPass = fillWith(false);
  const filled = firstPass.sittingOut.length > 0 ? fillWith(true) : firstPass;
  if (filled !== firstPass && filled.drilledAny && filled.sittingOut.length > 0) {
    weekReason("starred_rotation", starredRotationSentence(filled.sittingOut));
  }
  Object.assign(days, filled.plans);
  for (const day of drillingDays) {
    if (!days[day]) days[day] = { day, type: "drill", activities: [], totalMinutes: 0 };
  }

  days[restDay] = {
    day: restDay,
    type: "rest",
    activities: [],
    totalMinutes: 0,
  };

  const ptMinutes = round2(rules.ptDurationMinutes * timeMult);
  for (const day of scheduledPracticeTestDays) {
    days[day] = {
      day, type: "practice_test",
      activities: [{ kind: "PT", label: isNearTestWeek
        ? "LawHub Practice Test"
        : `Practice Test (from PT ${rules.ptSourceCutoff}+)`, minutes: ptMinutes }],
      totalMinutes: ptMinutes,
      capacityOverageMinutes: Math.max(0, ptMinutes - student.dailyCapacityMinutes[day]),
    };
  }

  function setPracticeTestReviewDay(day: DayOfWeek, minutes: number) {
    days[day] = {
      day, type: "review",
      activities: [{ kind: "REVIEW", label: "PT Review + Blind Review", minutes }],
      totalMinutes: minutes,
      capacityOverageMinutes: Math.max(0, minutes - student.dailyCapacityMinutes[day]),
    };
  }
  for (const day of scheduledPracticeTestReviewDays) setPracticeTestReviewDay(day, ptMinutes);
  if (priorWeekPracticeTestReviewMinutes !== undefined) {
    setPracticeTestReviewDay("MONDAY", priorWeekPracticeTestReviewMinutes);
    dayReason("review_carried_over", "MONDAY", reviewCarriedOverSentence(analytics.weekOf));
  }

  if (scheduledPracticeTestDays.includes("SUNDAY")) {
    dayReason("practice_test_review_day_next_week", "SUNDAY", practiceTestReviewDayNextWeekSentence());
  }

  return { studentName, weekOf: analytics.weekOf, days, reasons };
}
