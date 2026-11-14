"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode, type Ref } from "react";
import { DAY_ORDER } from "@/lib/engine";
import { activityLabel } from "@/lib/activityLabel";
import { formatDuration } from "@/lib/formatDuration";
import { plannedActivityMinutes, scheduleActivityId } from "@/lib/currentWeeklySchedule";
import { doneActivityIds, formatScheduleWeekOf, remainingActivityCount, scheduledActivityCount, weekNotes } from "@/lib/scheduleCheckInSummary";
import { dayName, isoDateInWeek } from "@/lib/scheduleReasonText";
import type { ActivityCheckIn, DayOfWeek, DayPlan, Student, WeeklySchedule } from "@/lib/types";
import { saveActivityCheckIn } from "@/app/dashboard/actions";
import { FailureNotice } from "@/components/FailureNotice";
import { callAction } from "@/lib/callAction";
import { isUnexpectedFailure, type Answer } from "@/lib/unexpectedFailure";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReminderStrip } from "@/components/ui/ReminderStrip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InfoGlyph, StatusIcon } from "@/components/ui/StatusIcon";
import { COLUMN_GUTTER, FOCUS, MOTION, PAGE_COLUMN, cx } from "@/components/ui/classes";
import { DrillSetupGuide } from "@/components/DrillSetupGuide";
import { DRILL_LINK_PARAMETER, drillSetupGuide, type DrillSetupGuide as DrillSetupGuideContent } from "@/lib/drillSetupGuide";
import type { RoadToTestDay } from "@/lib/roadToTestDay";
import { WeekHeader } from "@/components/WeekHeader";
import { TodayCard, type NextStudyDay, type TodayActivity } from "@/components/TodayCard";
import { DayCard } from "@/components/DayCard";
import { buttonClass } from "@/components/ui/Button";

interface ScheduleCheckInViewProps {
  scheduleId: string;
  schedule: WeeklySchedule;
  student: Student;
  checkIns: ActivityCheckIn[];
  readOnly?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: string;
  /** The student's local date (YYYY-MM-DD). Adds the pace status and the Today label. */
  today?: string;
  uploadReminder?: boolean;
  notice?: ReactNode;
  thisWeek?: { drillLink: string | null; road: RoadToTestDay };
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const formatDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00.000Z`));

function emptyDayText(plan: DayPlan) {
  return plan.type === "rest" ? "Rest day. Nothing planned." : plan.type === "unscheduled" ? "Not scheduled." : "Nothing scheduled.";
}

function dayKind(plan: DayPlan, practiceTestDays: DayPlan["day"][]) {
  switch (plan.type) {
    case "unscheduled": return "Not scheduled";
    case "rest": return "Rest day";
    case "practice_test":
      return practiceTestDays.length > 1 ? `Practice test ${practiceTestDays.indexOf(plan.day) + 1} of ${practiceTestDays.length}` : "Practice test";
    case "review": return "Practice-test review";
    case "drill": return "Drilling";
  }
}

function ActivityRow({ label, done, onToggle, setUp }: { label: string; done: boolean; onToggle?: () => void; setUp?: ReactNode }) {
  const row = "flex min-h-9 min-w-0 flex-1 items-start gap-0.5 rounded-xs pr-2 text-left";
  const content = <>
    <span className="flex h-9 w-8 shrink-0 items-center justify-center">
      <span className="flex rounded-pill outline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-accent">
        <StatusIcon name={done ? "check-disc" : "open-circle"} className={done ? undefined : "group-hover:text-ink group-focus-visible:text-ink"} />
      </span>
    </span>
    <span className={cx("min-w-0 flex-1 py-[9px] text-small", done ? "text-smoke line-through decoration-fog" : "text-ink")}>{label}</span>
  </>;
  if (!onToggle) return <li className="flex items-start gap-1"><span className={row}>{content}<span className="sr-only">{done ? ", done" : ", not done"}</span></span>{setUp}</li>;
  return (
    <li className="flex items-start gap-1">
      <button type="button" role="checkbox" aria-checked={done} onClick={onToggle}
        className={cx("group cursor-pointer hover:bg-vellum focus-visible:outline-none", row, MOTION)}>
        {content}
      </button>
      {setUp}
    </li>
  );
}

function SetUpButton({ label, where, expanded, onOpen, ref, look = "row" }: {
  label: string;
  where?: string;
  expanded: boolean;
  onOpen: (opener: HTMLElement) => void;
  ref: Ref<HTMLButtonElement>;
  look?: "row" | "quiet" | "outline";
}) {
  const quiet = cx("shrink-0 whitespace-nowrap rounded-sm px-2.5 text-small font-medium text-smoke pointer-hover:text-ink",
    "select-none active:scale-97 motion-reduce:active:scale-100",
    "[transition:color_var(--duration-fast)_ease-out,scale_var(--duration-fast)_var(--ease-out-strong)]", FOCUS);
  return (
    <button ref={ref} type="button" aria-haspopup="dialog" aria-expanded={expanded} aria-label={`Set up ${label}${where ? `, ${where}` : ""}`}
      onClick={(event) => onOpen(event.currentTarget)}
      className={look === "outline" ? buttonClass({ variant: "outline", size: "md" }) : cx(quiet, look === "row" ? "mt-0.5 h-8" : "h-10")}>
      Set up
    </button>
  );
}

const drillLink = (schedule: WeeklySchedule, activityId: string) => `${schedule.weekOf}:${activityId}`;

function linkedDrill(schedule: WeeklySchedule, link: string) {
  for (const day of DAY_ORDER) {
    const index = schedule.days[day].activities.findIndex((_, index) => drillLink(schedule, scheduleActivityId(day, index)) === link);
    const activity = schedule.days[day].activities[index];
    const guide = activity && drillSetupGuide(activity);
    if (guide) return { activityId: scheduleActivityId(day, index), day, label: activityLabel(activity), guide };
  }
}

const GUIDE_ENTRY = "drillSetupGuide";

function guideEntryLink(): string | undefined {
  const link: unknown = history.state?.[GUIDE_ENTRY];
  return typeof link === "string" ? link : undefined;
}

function clearGuideEntry() {
  const url = new URL(location.href);
  if (!url.searchParams.has(DRILL_LINK_PARAMETER) && guideEntryLink() === undefined) return;
  url.searchParams.delete(DRILL_LINK_PARAMETER);
  const state = { ...history.state };
  delete state[GUIDE_ENTRY];
  history.replaceState(state, "", url);
}

interface OpenGuide {
  key: number;
  activityId: string;
  day: string;
  label: string;
  guide: DrillSetupGuideContent;
  opener: HTMLElement;
  open: boolean;
}

export default function ScheduleCheckInView({
  scheduleId,
  schedule,
  student,
  checkIns,
  readOnly = false,
  header,
  footer,
  padding,
  today,
  uploadReminder = false,
  notice,
  thisWeek,
}: ScheduleCheckInViewProps) {
  const [savedCheckIns, setSavedCheckIns] = useState(checkIns);
  const [lastSave, setLastSave] = useState<{ activityId: string; answer: Answer<ActivityCheckIn> } | null>(null);
  const confirmedCheckIns = useRef(checkIns);
  const pendingSaves = useRef(new Map<string, number>());
  const [, startTransition] = useTransition();
  const [openGuide, setOpenGuide] = useState<OpenGuide | null>(null);
  const setUpButtons = useRef(new Map<string, HTMLButtonElement>());
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const guideEntry = useRef<"none" | "open" | "closing">("none");
  const openedOnLoad = useRef(false);
  const link = thisWeek?.drillLink ?? null;
  const usesHistory = thisWeek !== undefined;
  const doneIds = doneActivityIds(savedCheckIns);
  const totalActivities = scheduledActivityCount(schedule);
  const doneActivities = totalActivities - remainingActivityCount(schedule, savedCheckIns);
  const dates = DAY_ORDER.map((_, index) => isoDateInWeek(schedule.weekOf, index));
  const activitiesOn = (counts: (date: string) => boolean) => DAY_ORDER.reduce(
    (due, day, index) => counts(dates[index]!) ? due + schedule.days[day].activities.length : due, 0);
  const dueSoFar = today === undefined ? undefined : activitiesOn((date) => date <= today);
  const dueBeforeToday = today === undefined ? 0 : activitiesOn((date) => date < today);
  const practiceTestDays = DAY_ORDER.filter((day) => schedule.days[day].type === "practice_test");
  const dayReasons = (day: DayOfWeek) => schedule.reasons?.filter((reason) =>
    reason.placement.scope === "day" && reason.placement.day === day && reason.code !== "capacity_overage") ?? [];

  function showGuide(activityId: string, day: DayOfWeek, label: string, guide: DrillSetupGuideContent, opener: HTMLElement,
    entryUrl = location.href) {
    setOpenGuide((previous) => ({ key: (previous?.key ?? 0) + 1, activityId, day: dayName(day), label, guide, opener, open: true }));
    if (!usesHistory || guideEntry.current === "open") return;
    history.pushState({ [GUIDE_ENTRY]: drillLink(schedule, activityId) }, "", entryUrl);
    guideEntry.current = "open";
  }

  function closeGuide() {
    setOpenGuide((previous) => previous && { ...previous, open: false });
    if (guideEntry.current !== "open") return;
    guideEntry.current = "closing";
    history.back();
  }

  useEffect(() => {
    if (!usesHistory) return;
    function onPopState() {
      if (guideEntry.current === "open") setOpenGuide((previous) => previous && { ...previous, open: false });
      guideEntry.current = "none";
      clearGuideEntry();
    }
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, [usesHistory]);

  useEffect(() => {
    if (!usesHistory || openedOnLoad.current) return;
    openedOnLoad.current = true;
    const reloaded = guideEntryLink();
    const opening = reloaded ?? link;
    const linked = opening === null ? undefined : linkedDrill(schedule, opening);
    const entryUrl = location.href;
    if (reloaded !== undefined && linked) guideEntry.current = "open";
    else if (reloaded !== undefined || linked) clearGuideEntry();
    const opener = linked && (setUpButtons.current.get(linked.activityId) ?? rows.current.get(linked.activityId));
    if (linked) showGuide(linked.activityId, linked.day, linked.label, linked.guide, opener!, entryUrl);
  });

  function setUpFor(day: DayOfWeek, index: number, look?: "row" | "quiet" | "outline", where?: string) {
    const activity = schedule.days[day].activities[index]!;
    const activityId = scheduleActivityId(day, index);
    const guide = drillSetupGuide(activity);
    if (!guide) return null;
    const label = activityLabel(activity);
    return <SetUpButton label={label} where={where} look={look} expanded={openGuide?.open === true && openGuide.activityId === activityId}
      ref={(button) => {
        if (button) setUpButtons.current.set(activityId, button);
        else setUpButtons.current.delete(activityId);
      }}
      onOpen={(opener) => showGuide(activityId, day, label, guide, opener)} />;
  }

  const todayIndex = thisWeek && !readOnly ? dates.indexOf(today ?? "") : -1;
  const todayDay = DAY_ORDER[todayIndex];

  const activitiesOf = (day: DayOfWeek): TodayActivity[] => schedule.days[day].activities.map((activity, index) => ({
    id: scheduleActivityId(day, index),
    label: activityLabel(activity),
    minutes: plannedActivityMinutes(activity),
    section: drillSetupGuide(activity)?.section ?? null,
  }));
  const indexOf = (day: DayOfWeek, activityId: string) =>
    schedule.days[day].activities.findIndex((_, index) => scheduleActivityId(day, index) === activityId);
  const rowRef = (activityId: string) => (button: HTMLButtonElement | null) => {
    if (button) rows.current.set(activityId, button);
    else rows.current.delete(activityId);
  };

  function dayText(day: DayOfWeek) {
    const plan = schedule.days[day];
    const reasons = dayReasons(day);
    const unscheduledReason = plan.type === "unscheduled" ? reasons.find((reason) => reason.code === "unscheduled_day") : undefined;
    return {
      notes: reasons.filter((reason) => reason !== unscheduledReason).map((reason) => reason.sentence),
      emptyText: unscheduledReason?.sentence ?? emptyDayText(plan),
    };
  }

  function todayCard(day: DayOfWeek) {
    const nextDay = DAY_ORDER.slice(todayIndex + 1).find((later) => schedule.days[later].activities.length > 0);
    const next: NextStudyDay | null = nextDay ? {
      day: dayName(nextDay),
      date: formatDate(dates[DAY_ORDER.indexOf(nextDay)]!),
      activities: schedule.days[nextDay].activities.length,
      minutes: Math.round(schedule.days[nextDay].activities.reduce((total, activity) => total + plannedActivityMinutes(activity), 0)),
    } : null;
    return <TodayCard
      day={dayName(day)}
      date={formatDate(dates[todayIndex]!)}
      activities={activitiesOf(day)}
      {...dayText(day)}
      next={next}
      doneIds={doneIds}
      onToggle={toggle}
      setUp={(activityId, look) => setUpFor(day, indexOf(day, activityId), look)}
      rowRef={rowRef}
    />;
  }

  function restOfWeek() {
    const heading = readOnly ? "Days" : todayDay === "SUNDAY" ? "Earlier this week" : "Rest of the week";
    return (
      <section data-page-section aria-labelledby="rest-of-week" className="flex flex-col gap-3">
        <h2 id="rest-of-week" className={cx("px-1 text-small font-medium text-smoke", readOnly && "sr-only")}>{heading}</h2>
        {DAY_ORDER.map((day, dayIndex) => day !== todayDay && <DayCard key={day}
          day={dayName(day)}
          date={formatDate(dates[dayIndex]!)}
          kind={dayKind(schedule.days[day], practiceTestDays)}
          capacityMinutes={student.dailyCapacityMinutes[day]}
          activities={activitiesOf(day)}
          {...dayText(day)}
          past={today !== undefined && dates[dayIndex]! < today}
          doneIds={doneIds}
          onToggle={readOnly ? undefined : toggle}
          setUp={(activityId) => setUpFor(day, indexOf(day, activityId), "quiet", dayName(day))}
          rowRef={rowRef}
        />)}
      </section>
    );
  }

  function toggle(activityId: string) {
    const status = doneIds.has(activityId) ? "not_started" : "completed";
    const others = (checkIns: ActivityCheckIn[]) => checkIns.filter((checkIn) => checkIn.activityId !== activityId);
    setSavedCheckIns((previous) => [...others(previous), { scheduleId, activityId, status }]);
    pendingSaves.current.set(activityId, (pendingSaves.current.get(activityId) ?? 0) + 1);
    startTransition(async () => {
      const answer = await callAction(saveActivityCheckIn)({ scheduleId, activityId, status });
      const stillPending = pendingSaves.current.get(activityId)! - 1;
      pendingSaves.current.set(activityId, stillPending);
      setLastSave({ activityId, answer });
      if (!isUnexpectedFailure(answer)) confirmedCheckIns.current = [...others(confirmedCheckIns.current), answer];
      if (stillPending > 0) return;
      const confirmed = confirmedCheckIns.current.filter((checkIn) => checkIn.activityId === activityId);
      setSavedCheckIns((previous) => [...others(previous), ...confirmed]);
    });
  }

  return (
    <>
      {notice && <div data-page-section className={cx(PAGE_COLUMN, "py-5 md:py-8")}>{notice}</div>}
      <div data-page-section>
        {uploadReminder && (
          <ReminderStrip
            message="Next week starts Monday. Add your screenshots to build your weekly schedule."
            href="/dashboard/upload"
            action="Plan next week"
          />
        )}
        {thisWeek ? <WeekHeader
          className={cx(PAGE_COLUMN, "pt-8 lg:pt-10")}
          weekOf={schedule.weekOf}
          preview={readOnly}
          notes={weekNotes(schedule)}
          count={{ done: doneActivities, total: totalActivities, dueBeforeToday }}
          road={thisWeek.road}
        /> : header ?? <PageHeader
          gutter={COLUMN_GUTTER}
          eyebrow={`Week of ${formatScheduleWeekOf(schedule.weekOf)}`}
          title="Your plan for this week"
          lead={readOnly ? undefined : "Your plan is set. Check off as you go."}
          notes={weekNotes(schedule)}
          aside={<div aria-live="polite"><ProgressBar done={doneActivities} total={totalActivities} dueSoFar={dueSoFar} /></div>}
        />}
      </div>
      <FailureNotice action={lastSave?.activityId} answer={lastSave?.answer ?? null} />
      <div className={cx("flex flex-col", thisWeek ? "gap-6" : "gap-4", padding ?? cx(PAGE_COLUMN, thisWeek ? "pt-6 pb-16 md:pb-24" : "pt-8 pb-16 md:pt-16 md:pb-24"))}>
        {link !== null && !linkedDrill(schedule, link) && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-vellum-line bg-paper px-4 py-3 text-small text-ink shadow-control">
            <InfoGlyph className="size-4" />That drill is not in this week.
          </p>
        )}
        {todayDay && todayCard(todayDay)}
        {thisWeek ? restOfWeek() : DAY_ORDER.map((day, dayIndex) => {
          const plan = schedule.days[day];
          const plannedMinutes = Math.round(plan.activities.reduce((total, activity) => total + plannedActivityMinutes(activity), 0));
          const reasons = dayReasons(day);
          const activityIds = plan.activities.map((_, index) => scheduleActivityId(day, index));
          const allDone = activityIds.length > 0 && activityIds.every((id) => doneIds.has(id));
          const isToday = dates[dayIndex] === today;
          const date = formatDate(dates[dayIndex]!);
          return (
            <section key={day} data-page-section>
              <Card className={plan.activities.length === 0 ? "gap-2" : undefined}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
                  <h2 className="flex items-baseline gap-2 text-h6 font-medium text-ink">
                    {dayName(day)} <span className={cx("text-small font-regular", isToday ? "text-ink" : "text-smoke")}>{isToday ? `Today, ${date}` : date}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-small text-smoke">
                      {dayKind(plan, practiceTestDays)} · {formatDuration(plannedMinutes)} of {formatDuration(student.dailyCapacityMinutes[day])}
                    </span>
                    {allDone && <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-small text-ink"><StatusIcon name="check-circle" />All done</span>}
                  </div>
                </div>
                {reasons.map((reason, index) => <p className="px-2 text-small text-smoke" key={`${reason.code}-${index}`}>{reason.sentence}</p>)}
                {plan.activities.length === 0 ? (
                  plan.type === "unscheduled" && reasons.length > 0 ? null : <p className="px-2 text-small text-smoke">{emptyDayText(plan)}</p>
                ) : (
                  <ul className="flex flex-col">
                    {plan.activities.map((activity, index) => {
                      const activityId = activityIds[index]!;
                      return <ActivityRow key={activityId} label={activityLabel(activity)} done={doneIds.has(activityId)} setUp={setUpFor(day, index)}
                        onToggle={readOnly ? undefined : () => toggle(activityId)} />;
                    })}
                  </ul>
                )}
              </Card>
            </section>
          );
        })}
        {footer}
      </div>
      {openGuide && <DrillSetupGuide key={openGuide.key} open={openGuide.open} returnFocusTo={openGuide.opener}
        onClose={closeGuide}
        day={openGuide.day} label={openGuide.label} guide={openGuide.guide} />}
    </>
  );
}
