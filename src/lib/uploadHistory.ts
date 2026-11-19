import { monthLabel, weekLabel } from "./progressHistory";
import type { AnalyticsSnapshot, LRStemType, LRType, RCType } from "./types";

type Snapshot = Pick<AnalyticsSnapshot, "weekOf" | "lrAccuracyByType" | "rcAccuracyByType"> & { id: string; approvedAt: string; score: number | null };
type PracticeTest = { weekOf: string; prepTest: number; missed: number; missedStemTypeCounts: Partial<Record<LRStemType, number>> };

export type TypeAccuracy = { type: LRType; accuracy: number; change: number | null };

export type Upload = {
  id: string;
  label: string;
  tag: "Newest" | "First upload" | null;
  score: number | null;
  scoreChange: number | null;
  lr: TypeAccuracy[];
  rc: { type: RCType; accuracy: number }[];
  movedMost: TypeAccuracy[];
  practiceTest: { prepTest: number; missed: number; missedTypes: [LRStemType, number][] } | null;
};

export type UploadMonth = { month: string; uploads: Upload[] };

const MOVED_MOST = 2;

function entries<Key extends string>(record: Partial<Record<Key, number>> | undefined) {
  return Object.entries(record ?? {}) as [Key, number][];
}

function upload(snapshot: Snapshot, before: Snapshot | undefined, scoreBefore: number | null, tag: Upload["tag"], practiceTests: PracticeTest[]): Upload {
  const lr = entries(snapshot.lrAccuracyByType)
    .map(([type, accuracy]) => {
      const earlier = before?.lrAccuracyByType[type];
      return { type, accuracy, change: earlier === undefined ? null : accuracy - earlier };
    })
    .toSorted((first, second) => first.accuracy - second.accuracy);
  const test = practiceTests.find((practiceTest) => practiceTest.weekOf === snapshot.weekOf);
  return {
    id: snapshot.id,
    label: weekLabel(snapshot.weekOf),
    tag,
    score: snapshot.score,
    scoreChange: snapshot.score === null || scoreBefore === null ? null : snapshot.score - scoreBefore,
    lr,
    rc: entries(snapshot.rcAccuracyByType).map(([type, accuracy]) => ({ type, accuracy })),
    movedMost: lr
      .filter((row) => Math.round((row.change ?? 0) * 100) !== 0)
      .toSorted((first, second) => Math.abs(second.change ?? 0) - Math.abs(first.change ?? 0))
      .slice(0, MOVED_MOST),
    practiceTest: test
      ? {
        prepTest: test.prepTest,
        missed: test.missed,
        missedTypes: entries(test.missedStemTypeCounts).toSorted((first, second) => second[1] - first[1]),
      }
      : null,
  };
}

export function uploadHistory(snapshots: Snapshot[], practiceTests: PracticeTest[]): UploadMonth[] {
  const oldestFirst = snapshots.toSorted((first, second) => first.approvedAt.localeCompare(second.approvedAt));
  const newest = oldestFirst.length - 1;
  const months: UploadMonth[] = [];
  for (let index = newest; index >= 0; index--) {
    const snapshot = oldestFirst[index]!;
    const tag = index === newest ? "Newest" : index === 0 ? "First upload" : null;
    const month = monthLabel(snapshot.weekOf);
    let group = months.at(-1);
    if (group?.month !== month) {
      group = { month, uploads: [] };
      months.push(group);
    }
    const scoreBefore = oldestFirst.slice(0, index).findLast((earlier) => earlier.score !== null)?.score ?? null;
    group.uploads.push(upload(snapshot, oldestFirst[index - 1], scoreBefore, tag, practiceTests));
  }
  return months;
}
