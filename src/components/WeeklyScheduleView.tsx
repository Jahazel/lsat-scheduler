import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { mockRules } from "@/lib/mockData";
import type { Activity, LRActivity, RCActivity, Student, WeeklySchedule } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  drill: "Drilling",
  practice_test: "Practice Test",
  review: "Review",
  rest: "Rest",
};

export function weeksUntilTest(goalTestDate: string | undefined): string | null {
  if (!goalTestDate) return null;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.ceil((new Date(goalTestDate).getTime() - Date.now()) / msPerWeek);
  if (Number.isNaN(weeks)) return null;
  if (weeks < 0) return "test date passed";
  if (weeks === 0) return "test this week";
  return `${weeks} week${weeks === 1 ? "" : "s"} until test`;
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

interface WeeklyScheduleViewProps {
  schedule: WeeklySchedule;
  student: Student;
  isRealAnalytics: boolean;
}

export default function WeeklyScheduleView({ schedule, student, isRealAnalytics }: WeeklyScheduleViewProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        {schedule.studentName}&rsquo;s Week of {schedule.weekOf}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {student.weekdayHours}h/day capacity · score {student.currentScore}
        {student.goalScore ? ` → goal ${student.goalScore}` : ""}
        {weeksUntilTest(student.goalTestDate) ? ` · ${weeksUntilTest(student.goalTestDate)}` : ""}
        {isRealAnalytics ? "" : " (placeholder analytics)"}
      </p>
      <p className="mt-1 text-xs text-ink-400">
        Drilling from PT {mockRules.drillSourceCutoff - 1} and below · Practice Test from PT{" "}
        {mockRules.ptSourceCutoff}+
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {DAY_ORDER.map((day) => {
          const plan = schedule.days[day];
          return (
            <div key={day} className="rounded-lg border border-ink-100 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-sm font-semibold tracking-wide text-ink-900">{day}</h2>
                <span className="text-xs text-ink-500">
                  {TYPE_LABEL[plan.type]} · {plan.totalMinutes} min
                </span>
              </div>
              {day === "SATURDAY" && schedule.saturdayOverageMinutes && schedule.saturdayOverageMinutes > 0 && (
                <p className="mt-1 text-xs text-accent-700">
                  {schedule.saturdayOverageMinutes} min over your stated Saturday capacity for the full practice test.
                </p>
              )}
              {plan.activities.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">
                  {plan.type === "rest" ? "Rest day." : "Nothing scheduled."}
                </p>
              ) : plan.type === "drill" ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-700">
                  {(() => {
                    const lrLines = plan.activities
                      .filter((a): a is LRActivity => a.kind === "LR")
                      .map(lrActivityLabel);
                    const rcLines = rcDisplayLines(plan.activities);
                    // Which block leads alternates day to day — match
                    // whatever order the engine actually filled in.
                    const ordered =
                      plan.activities[0]?.kind === "RC" ? [rcLines, lrLines] : [lrLines, rcLines];
                    return ordered.flat().map((line, i) => <li key={i}>{line}</li>);
                  })()}
                </ul>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-700">
                  {plan.activities.map((activity, i) => (
                    <li key={i}>{activityLabel(activity)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
