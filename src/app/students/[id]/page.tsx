import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";
import { DAY_ORDER, generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules } from "@/lib/mockData";
import type { Activity, AnalyticsSnapshot, LRActivity, RCActivity, Student } from "@/lib/types";
import AnalyticsUploader from "./AnalyticsUploader";

const TYPE_LABEL: Record<string, string> = {
  drill: "Drilling",
  practice_test: "Practice Test",
  review: "Review",
  rest: "Rest",
};

function weeksUntilTest(goalTestDate: string | undefined): string | null {
  if (!goalTestDate) return null;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.ceil((new Date(goalTestDate).getTime() - Date.now()) / msPerWeek);
  if (Number.isNaN(weeks)) return null;
  if (weeks < 0) return "test date passed";
  if (weeks === 0) return "test this week";
  return `${weeks} week${weeks === 1 ? "" : "s"} until test`;
}

// PT/REVIEW days only ever carry PT/REVIEW activities — LR/RC drill days
// use lrActivityLabel/rcDisplayLines below instead, for the sorting and
// grouping a drill day needs.
function activityLabel(activity: Activity): string {
  switch (activity.kind) {
    case "LR":
      return `${activity.questionCount} ${activity.type} (${activity.difficultyRange})`;
    case "RC":
      return `${activity.passageCount} ${activity.type} passage${activity.passageCount > 1 ? "s" : ""} (L${activity.difficultyLevel})`;
    case "PT":
    case "REVIEW":
      return activity.label;
  }
}

function lrActivityLabel(activity: LRActivity): string {
  if (activity.isFullSection) return "1 Full LR Section";
  return `${activity.questionCount} ${activity.type} (${activity.difficultyRange})`;
}

// RC passages are individually picked (weakest/spread logic, not display
// concerns), so the day's list is re-sorted ascending by difficulty and
// re-grouped into the RC unit sizes (1 and 2) for display — a day with 3
// passages shows as "1 passage" then "2 passages", not three separate
// singles. The week's one full section, if it landed here, renders as its
// own summary line instead of a passage count.
function rcDisplayLines(activities: Activity[]): string[] {
  const rc = activities.filter((a): a is RCActivity => a.kind === "RC");
  const fullSection = rc.find((a) => a.isFullSection);
  const regular = [...rc.filter((a) => !a.isFullSection)].sort(
    (a, b) => a.difficultyLevel - b.difficultyLevel
  );

  const lines: string[] = [];
  let i = 0;
  if (regular.length % 2 === 1) {
    lines.push(`1 ${regular[0].type} passage (L${regular[0].difficultyLevel})`);
    i = 1;
  }
  for (; i < regular.length; i += 2) {
    const a = regular[i];
    const b = regular[i + 1];
    lines.push(`2 passages: ${a.type} (L${a.difficultyLevel}), ${b.type} (L${b.difficultyLevel})`);
  }
  if (fullSection) lines.push("1 Full RC Section");
  return lines;
}

export default async function StudentSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await connectDB();
  const doc = await StudentModel.findById(id).lean();
  if (!doc) {
    notFound();
  }

  const student: Student = {
    name: doc.name,
    platform: doc.platform,
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    weekdayHours: doc.weekdayHours,
    weekendHours: doc.weekendHours,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };

  const snapshotDoc = await AnalyticsSnapshotModel.findOne({ studentId: id }).lean();
  const analytics: AnalyticsSnapshot = snapshotDoc
    ? {
        weekOf: snapshotDoc.weekOf,
        lrAccuracyByType: snapshotDoc.lrAccuracyByType,
        lrTopPriorityLogicTypes: snapshotDoc.lrTopPriorityLogicTypes,
      }
    : mockAnalytics;
  const isRealAnalytics = Boolean(snapshotDoc);

  const schedule = generateWeek(student, analytics, mockRules);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {schedule.studentName}&rsquo;s Week of {schedule.weekOf}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {student.weekdayHours}h/day capacity · score {student.currentScore}
          {student.goalScore ? ` → goal ${student.goalScore}` : ""}
          {weeksUntilTest(student.goalTestDate) ? ` · ${weeksUntilTest(student.goalTestDate)}` : ""}
          {isRealAnalytics ? "" : " (placeholder analytics)"}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Drilling from PT {mockRules.drillSourceCutoff - 1} and below · Practice Test from PT{" "}
          {mockRules.ptSourceCutoff}+
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {DAY_ORDER.map((day) => {
            const plan = schedule.days[day];
            return (
              <div
                key={day}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-sm font-semibold tracking-wide text-black dark:text-zinc-50">
                    {day}
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {TYPE_LABEL[plan.type]} · {plan.totalMinutes} min
                  </span>
                </div>
                {plan.activities.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                    {plan.type === "rest" ? "Rest day." : "Nothing scheduled."}
                  </p>
                ) : plan.type === "drill" ? (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {(() => {
                      const lrLines = plan.activities
                        .filter((a): a is LRActivity => a.kind === "LR")
                        .map(lrActivityLabel);
                      const rcLines = rcDisplayLines(plan.activities);
                      // Which block leads alternates day to day — match
                      // whatever order the engine actually filled in.
                      const ordered = plan.activities[0]?.kind === "RC" ? [rcLines, lrLines] : [lrLines, rcLines];
                      return ordered.flat().map((line, i) => <li key={i}>{line}</li>);
                    })()}
                  </ul>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {plan.activities.map((activity, i) => (
                      <li key={i}>{activityLabel(activity)}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <AnalyticsUploader studentId={id} />
      </div>
    </div>
  );
}
