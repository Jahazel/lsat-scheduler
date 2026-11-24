import type { ReadOnlyCurrentWeekResult } from "./readOnlyCurrentWeekSchedule";

const previewStartDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
});

const formatWeekStart = (weekStartDate: string) => previewStartDate.format(new Date(`${weekStartDate}T00:00:00.000Z`));

export function adminScheduleStateMessage(result: Exclude<ReadOnlyCurrentWeekResult, { kind: "schedule" }>) {
  switch (result.kind) {
    case "held_week":
      return "This student's weekly schedule for this week is held. It appears when their first payment goes through.";
    case "next_week_preview":
      return `This student has saved their plan for next week. It starts ${formatWeekStart(result.weekStartDate)}.`;
    case "next_week_upload_confirmed":
      return `This student has confirmed their upload for next week, which starts ${formatWeekStart(result.weekStartDate)}. Their plan is saved when they open This week.`;
    case "analytics_required":
      return "This student needs confirmed, eligible analytics before a current weekly schedule can be created.";
    case "schedule_not_created":
      return "No saved schedule exists for the current week. The student must open their dashboard to create it.";
  }
}
