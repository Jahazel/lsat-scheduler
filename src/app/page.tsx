import { DAY_ORDER, generateWeek } from "@/lib/engine";
import { mockAnalytics, mockRules, mockStudent } from "@/lib/mockData";
import type { Activity } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  drill: "Drilling",
  practice_test: "Practice Test",
  review: "Review",
  rest: "Rest",
};

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

export default function Home() {
  const schedule = generateWeek(mockStudent, mockAnalytics, mockRules);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {schedule.studentName}&rsquo;s Week of {schedule.weekOf}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {mockStudent.weekdayHours}h/day capacity · score {mockAnalytics.currentScore} · standard time
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
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">Nothing scheduled.</p>
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
      </div>
    </div>
  );
}
