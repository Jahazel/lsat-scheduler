import { mockAnalytics } from "@/lib/mockData";
import type { AnalyticsSnapshot, LRLogicType, LRType, RCType } from "@/lib/types";

const MIN_ACCURACY_POINTS = 10;
const MAX_ACCURACY_POINTS = 95;
const LOW_SCORE_CUTOFF = 150;
const HIGH_SCORE_CUTOFF = 165;
const SCORE_OFFSET_POINTS = 10;
const TWO_FLAGS_PROBABILITY = 0.2;
const DIRECTIONAL_TYPE_COUNT = 9;
const FLAG_SWAP_INTERVAL = 3;
const MIN_STEADY_TYPE_COUNT = 3;
const MAX_STEADY_TYPE_COUNT = 5;
const RC_PROFILE: Record<RCType, number> = { Law: 0.58, Comparative: 0.7, Science: 0.64, Humanities: 0.81, Art: 0.77 };
const MAX_RC_MOVE_POINTS = 3;

function hasRoom(points: number, sign: number, minimumStep = 1) {
  return sign > 0
    ? points + minimumStep <= MAX_ACCURACY_POINTS
    : points - minimumStep >= MIN_ACCURACY_POINTS;
}

export type SampleDirection = "improving" | "steady" | "slipping";

export interface SampleAnalyticsInput {
  previous: AnalyticsSnapshot | null;
  direction: SampleDirection;
  currentScore: number;
  earlierSampleCount: number;
  regularTypes: LRType[];
  restrictedTypes: LRLogicType[];
  random: () => number;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function pickInt(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function boundedAccuracy(value: number) {
  return Math.max(MIN_ACCURACY_POINTS, Math.min(MAX_ACCURACY_POINTS, value));
}

function profileValue(type: LRType, score: number) {
  const source = mockAnalytics.lrAccuracyByType[type] ?? 0.65;
  return boundedAccuracy(Math.round(source * 100 + scoreOffset(score)));
}

function scoreOffset(score: number) {
  return score < LOW_SCORE_CUTOFF ? -SCORE_OFFSET_POINTS : score >= HIGH_SCORE_CUTOFF ? SCORE_OFFSET_POINTS : 0;
}

function samplePassageAccuracy(input: SampleAnalyticsInput): Record<RCType, number> {
  const { previous, direction, currentScore, random } = input;
  const entries = (Object.keys(RC_PROFILE) as RCType[]).map((type) => {
    const prior = previous?.rcAccuracyByType?.[type];
    if (prior === undefined) return [type, boundedAccuracy(Math.round(RC_PROFILE[type] * 100 + scoreOffset(currentScore))) / 100];
    const move = direction === "steady"
      ? (random() < 0.5 ? -1 : 1)
      : (direction === "improving" ? 1 : -1) * pickInt(random, 1, MAX_RC_MOVE_POINTS);
    return [type, boundedAccuracy(Math.round(prior * 100) + move) / 100];
  });
  return Object.fromEntries(entries);
}

function chooseTopPriorityLogicTypes(input: SampleAnalyticsInput) {
  const { previous, restrictedTypes, earlierSampleCount, random } = input;
  const flags = previous?.lrTopPriorityLogicTypes.filter((type) => restrictedTypes.includes(type)) ?? [];
  if (!previous || flags.length === 0) {
    const count = restrictedTypes.length > 1 && random() < TWO_FLAGS_PROBABILITY ? 2 : 1;
    return shuffled(restrictedTypes, random).slice(0, count);
  }

  // The third, sixth, ... generated samples replace one existing flag.
  if ((earlierSampleCount + 1) % FLAG_SWAP_INTERVAL !== 0) return [...flags];
  const candidates = shuffled(restrictedTypes.filter((type) => !flags.includes(type)), random);
  if (candidates.length === 0) return [...flags];
  const next = [...flags];
  next.splice(Math.floor(random() * next.length), 1, candidates[0]);
  return next;
}

export function generateSampleAnalytics(input: SampleAnalyticsInput): Required<Pick<AnalyticsSnapshot, "lrAccuracyByType" | "lrTopPriorityLogicTypes" | "rcAccuracyByType">> {
  const { previous, direction, currentScore, regularTypes, random } = input;
  // Keep a defined point value alongside each regular type. Restricted types
  // never enter this list and therefore cannot leak into the returned accuracy.
  const accuracies = regularTypes.map((type) => {
    const prior = previous?.lrAccuracyByType[type];
    return {
      type,
      points: prior === undefined ? profileValue(type, currentScore) : boundedAccuracy(Math.round(prior * 100)),
    };
  });

  if (previous) {
    if (direction === "steady") {
      const count = Math.min(accuracies.length, pickInt(random, MIN_STEADY_TYPE_COUNT, MAX_STEADY_TYPE_COUNT));
      const upCandidates = shuffled(accuracies.filter(({ points }) => hasRoom(points, 1)), random);
      const downCandidates = accuracies.filter(({ points }) => hasRoom(points, -1));
      const preferredUps = Math.floor(count / 2) + (count % 2 && random() < 0.5 ? 1 : 0);
      const upCount = Math.max(count - downCandidates.length, Math.min(preferredUps, upCandidates.length));
      // Use types that cannot move down first, preserving room for the down moves.
      upCandidates.sort((a, b) => Number(hasRoom(a.points, -1)) - Number(hasRoom(b.points, -1)));
      const upMoves = upCandidates.slice(0, upCount);
      const downMoves = shuffled(downCandidates.filter((accuracy) => !upMoves.includes(accuracy)), random).slice(0, count - upCount);
      for (const accuracy of upMoves) accuracy.points = boundedAccuracy(accuracy.points + pickInt(random, 1, 2));
      for (const accuracy of downMoves) accuracy.points = boundedAccuracy(accuracy.points - pickInt(random, 1, 2));
      // At most five two-point moves change the 27-type average by less than half a point.
    } else {
      const sign = direction === "improving" ? 1 : -1;
      const mainMoves = shuffled(accuracies.filter(({ points }) => hasRoom(points, sign, 2)), random)
        .slice(0, DIRECTIONAL_TYPE_COUNT);
      let netDirectionalChange = 0;
      for (const accuracy of mainMoves) {
        const next = boundedAccuracy(accuracy.points + sign * pickInt(random, 2, 5));
        netDirectionalChange += (next - accuracy.points) * sign;
        accuracy.points = next;
      }
      const oppositeMoves = shuffled(accuracies.filter((accuracy) =>
        !mainMoves.includes(accuracy) && hasRoom(accuracy.points, -sign)), random)
        .slice(0, pickInt(random, 1, 2));
      for (const accuracy of oppositeMoves) {
        const next = boundedAccuracy(accuracy.points - sign * pickInt(random, 1, 2));
        const oppositeChange = (accuracy.points - next) * sign;
        if (netDirectionalChange > oppositeChange) {
          accuracy.points = next;
          netDirectionalChange -= oppositeChange;
        }
      }
    }
  }

  const lrTopPriorityLogicTypes = chooseTopPriorityLogicTypes(input);
  return {
    lrAccuracyByType: Object.fromEntries(accuracies.map(({ type, points }) => [type, points / 100])),
    lrTopPriorityLogicTypes,
    rcAccuracyByType: samplePassageAccuracy(input),
  };
}
