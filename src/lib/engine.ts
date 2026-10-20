import type {
  Activity, AnalyticsSnapshot, DayOfWeek, DayPlan, LRActivity, LRDrill, LRType,
  RCActivity, RCDrill, RCType, RulesConfig, ScheduleReason, Student, WeeklySchedule,
} from "./types";
import {
  capacityOverageSentence, dateInWeek, fullSectionDroppedSentence, isoDateInWeek, nearTestWeekSentence,
  noPracticeTestSentence, restDayMovedSentence, reviewCarriedOverSentence,
  skipReductionSentence, starredRotationSentence, practiceTestReviewDayNextWeekSentence,
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

export type WeekShapeOptions = {
  createdOn?: DayOfWeek;
  priorWeekPracticeTestReviewMinutes?: number;
  priorSchedules?: WeeklySchedule[];
} & (
  | { skipReductionPercent?: never; skipShare?: never }
  | { skipReductionPercent: number; skipShare: number }
);

function round2(n: number): number { return Math.round(n * 100) / 100; }
function multiplier(rules: RulesConfig, student: Student): number {
  return rules.accommodationTimeMultiplier[student.accommodationMultiplier];
}

interface LRCandidate { type: LRType; questionCount: number; difficultyRange: string; pairStart?: boolean; }
interface RCCandidate { type: RCType; passageCount: number; difficultyLevel: number; }

function recentTypeWeek(type: LRType, history: WeeklySchedule[]): string {
  return history.filter((schedule) => DAY_ORDER.some((day) => schedule.days[day].activities.some(
    (activity) => activity.kind === "LR" && !activity.isFullSection && activity.types.includes(type)
  ))).map((schedule) => schedule.weekOf).sort().at(-1) ?? "";
}

function lrTypeOrder(analytics: AnalyticsSnapshot, rules: RulesConfig, history: WeeklySchedule[], rotate: boolean): LRType[] {
  const listOrder = [...rules.lrStemTypes, ...rules.lrLogicTypes];
  const weakness = (a: LRType, b: LRType) =>
    (analytics.lrAccuracyByType[a] ?? 1) - (analytics.lrAccuracyByType[b] ?? 1)
    || listOrder.indexOf(a) - listOrder.indexOf(b);
  const starred = [...rules.lrStarredTypes].sort((a, b) =>
    rotate ? recentTypeWeek(a, history).localeCompare(recentTypeWeek(b, history)) || weakness(a, b) : weakness(a, b));
  if (rotate) return starred;
  const regular = [...rules.lrStemTypes, ...rules.lrLogicExceptions]
    .filter((type) => analytics.lrAccuracyByType[type] !== undefined && !starred.includes(type))
    .sort(weakness);
  return [...starred, ...analytics.lrTopPriorityLogicTypes.filter((type) => !starred.includes(type)), ...regular];
}

function buildLRList(order: LRType[], score: number, rules: RulesConfig): LRCandidate[] {
  const seen = new Set<LRType>();
  const list: LRCandidate[] = [];
  function add(type: LRType, questionCount: number) {
    list.push({ type, questionCount, difficultyRange: score >= rules.lrDifficultyCutoffScore || seen.has(type) ? "L3-5" : "L2-4" });
    seen.add(type);
  }
  order.forEach((type) => add(type, rules.lrUnitSizes.small));
  for (let lap = 0; lap < 8; lap++) {
    for (const type of order) {
      const pair = rules.lrPairedTypes.find(([a, b]) => a === type || b === type);
      if (pair) {
        add(type, rules.lrUnitSizes.small);
        list[list.length - 1].pairStart = true;
        add(pair[0] === type ? pair[1] : pair[0], rules.lrUnitSizes.small);
      } else add(type, rules.lrUnitSizes.medium);
    }
  }
  return list;
}

function buildRCList(rules: RulesConfig): RCCandidate[] {
  const list: RCCandidate[] = [];
  let cursor = 0;
  let comboIndex = 0;
  for (let lap = 0; lap < 8; lap++) {
    for (let i = 0; i < rules.rcTypes.length; i++) {
      const count = lap === 0 ? rules.rcUnitSizes.small : rules.rcUnitSizes.medium;
      const combo = count === 2 ? rules.rcTwoPassageDifficultyCombos[comboIndex++ % rules.rcTwoPassageDifficultyCombos.length] : undefined;
      for (let j = 0; j < count; j++) {
        list.push({ type: rules.rcTypes[cursor % rules.rcTypes.length], passageCount: 1,
          difficultyLevel: combo ? combo[j] : cursor % 4 + 2 });
        cursor++;
      }
    }
  }
  return list;
}

function lrMinutes(c: LRCandidate, rules: RulesConfig, timeMult: number): number {
  return round2(c.questionCount * rules.lrQuestionSeconds * timeMult / 60);
}
function rcMinutes(c: RCCandidate, rules: RulesConfig, timeMult: number): number {
  return round2(c.passageCount * rules.rcPassageSeconds * timeMult / 60);
}
function lrActivity(c: LRCandidate, minutes: number): LRDrill {
  return { kind: "LR", types: [c.type], questionCount: c.questionCount, difficultyRange: c.difficultyRange,
    drillMinutes: round2(minutes), isFullSection: false };
}
function rcActivity(c: RCCandidate, minutes: number): RCDrill {
  return { kind: "RC", passages: [{ type: c.type, difficultyLevel: c.difficultyLevel }],
    drillMinutes: round2(minutes), isFullSection: false };
}

interface FillState { lrIndex: number; rcIndex: number; lrQuestions: number; rcPassages: number; }
function fillDrillDay(lrList: LRCandidate[], rcList: RCCandidate[], state: FillState,
  limit: number, rules: RulesConfig, timeMult: number, lrFirst: boolean, fullSection?: Activity
): { activities: Activity[]; totalMinutes: number; lrDrills: number } {
  const lr: LRActivity[] = [];
  const rc: RCActivity[] = [];
  let used = fullSection?.kind === "LR" || fullSection?.kind === "RC" ? fullSection.drillMinutes : 0;
  let lrDrills = 0;
  const takeLR = () => {
    const c = lrList[state.lrIndex++];
    const minutes = lrMinutes(c, rules, timeMult);
    lr.push(lrActivity(c, minutes));
    used += minutes;
    state.lrQuestions += c.questionCount;
    lrDrills++;
  };
  const takeLRUnit = () => {
    const paired = lrList[state.lrIndex].pairStart;
    takeLR();
    if (paired) takeLR();
  };
  const takeRC = () => {
    const c = rcList[state.rcIndex++];
    const minutes = rcMinutes(c, rules, timeMult);
    rc.push(rcActivity(c, minutes));
    used += minutes;
    state.rcPassages += c.passageCount;
  };
  if (!fullSection) {
    if (state.lrQuestions <= state.rcPassages * 10) {
      const next = lrList[state.lrIndex];
      // A first-pass drill is followed by the next complete unit: another first-pass drill,
      // or at the pass boundary a 10-question drill or whole 5+5 pair.
      if (next.questionCount === rules.lrUnitSizes.small && !next.pairStart) takeLR();
      takeLRUnit();
    } else takeRC();
  }
  while (state.lrIndex < lrList.length && state.rcIndex < rcList.length) {
    const nextLR = lrList[state.lrIndex];
    const lrUnitMinutes = lrMinutes(nextLR, rules, timeMult) +
      (nextLR.pairStart ? lrMinutes(lrList[state.lrIndex + 1], rules, timeMult) : 0);
    const lrFits = used + lrUnitMinutes <= limit + 1e-8;
    const rcFits = used + rcMinutes(rcList[state.rcIndex], rules, timeMult) <= limit + 1e-8;
    if (!lrFits && !rcFits) break;
    const preferLR = state.lrQuestions <= state.rcPassages * 10;
    if (preferLR ? lrFits : !rcFits) {
      takeLRUnit();
    }
    else takeRC();
  }
  if (fullSection?.kind === "LR") lr.unshift(fullSection);
  if (fullSection?.kind === "RC") rc.unshift(fullSection);
  const activities = lrFirst ? [...lr, ...rc] : [...rc, ...lr];
  return { activities, totalMinutes: round2(activities.reduce((total, activity) =>
    total + activity.drillMinutes, 0)), lrDrills };
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
  const recordOverage = (day: DayOfWeek, plan: DayPlan) => {
    if (!plan.capacityOverageMinutes || plan.capacityOverageMinutes <= 0) return;
    dayReason("capacity_overage", day, capacityOverageSentence(day, plan, student.dailyCapacityMinutes[day]));
  };

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
  const rcList = buildRCList(rules);
  const reduction = Math.max(0, Math.min(0.25, options.skipReductionPercent ?? 0));
  if (reduction > 0) {
    if (options.skipShare === undefined) throw new Error("Skip reduction requires skipShare");
    weekReason("skip_reduction", skipReductionSentence(options.skipShare, reduction));
  }
  const fillWith = (rotate: boolean) => {
    const lrList = buildLRList(lrTypeOrder(analytics, rules, history, rotate), student.currentScore, rules);
    const state: FillState = { lrIndex: 0, rcIndex: 0, lrQuestions: 0, rcPassages: 0 };
    const plans = {} as Partial<Record<DayOfWeek, DayPlan>>;
    let lrDrills = 0;
    activeDrillingDays.forEach((day) => {
      const full = day === fullSectionDay ? fullSectionActivity(fullSubject, rules, timeMult) : undefined;
      const result = fillDrillDay(lrList, rcList, state, student.dailyCapacityMinutes[day] * (1 - reduction),
        rules, timeMult, drillingDays.indexOf(day) % 2 === 1, full);
      lrDrills += result.lrDrills;
      plans[day] = { day, type: "drill", activities: result.activities,
        totalMinutes: result.totalMinutes,
        capacityOverageMinutes: Math.max(0, round2(result.totalMinutes - student.dailyCapacityMinutes[day])) };
    });
    return { plans, lrDrills };
  };
  const firstPass = fillWith(false);
  const filled = firstPass.lrDrills < rules.lrStarredTypes.length ? fillWith(true) : firstPass;
  if (filled !== firstPass && filled.lrDrills > 0) {
    const scheduled = new Set(Object.values(filled.plans).flatMap((plan) => plan?.activities ?? [])
      .filter((activity): activity is LRDrill => activity.kind === "LR" && !activity.isFullSection)
      .flatMap((activity) => activity.types));
    const sittingOut = rules.lrStarredTypes.filter((type) => !scheduled.has(type));
    if (sittingOut.length > 0) weekReason("starred_rotation", starredRotationSentence(sittingOut));
  }
  Object.assign(days, filled.plans);
  for (const day of activeDrillingDays) recordOverage(day, days[day]);
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
    recordOverage(day, days[day]);
  }

  function setPracticeTestReviewDay(day: DayOfWeek, minutes: number) {
    days[day] = {
      day, type: "review",
      activities: [{ kind: "REVIEW", label: "PT Review + Blind Review", minutes }],
      totalMinutes: minutes,
      capacityOverageMinutes: Math.max(0, minutes - student.dailyCapacityMinutes[day]),
    };
    recordOverage(day, days[day]);
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
