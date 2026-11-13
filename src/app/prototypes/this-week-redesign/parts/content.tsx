"use client";

import { cx } from "@/components/ui/classes";
import { DrillSetupGuide } from "@/components/DrillSetupGuide";
import { Button } from "@/components/ui/Button";
import type { Enter, View } from "../view";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { DAY_KEYS, DAY_NAMES, type Activity, type Day, type Week } from "./data";
import { Icon } from "./icons";
import type { HeaderVariantProps } from "./headers";
import type { NoticeVariant } from "./notices";
import type { RestProps } from "./rest";
import { nextStudyDay, type TodayProps } from "./today";

type OpenGuide = { key: number; activity: Activity; day: Day; opener: HTMLElement; open: boolean };

export type Surface = "grey" | "white";

// Cards read as white on the grey canvas, and as soft grey groups on a white panel (inspiration: Inbox "Queued" group).
export const card = (surface: Surface) =>
  surface === "grey" ? "rounded-lg border border-vellum-line bg-paper shadow-control" : "rounded-lg border border-vellum-line bg-paper";

// Next week has no check-ins yet, whatever the demo data ticks.
const NO_TICKS = new Set<string>();

// The drill a link names: a real drill on Thursday, or one from another week.
const LINKED: Partial<Record<Enter, string>> = { drill: "thu-1", nodrill: "2026-11-02:tue-0" };

export function WeekContent({ view, week, done, toggle, go, WeekHeader, Today, Rest, Notices }: { view: View; week: Week; done: Set<string>; toggle: (id: string) => void; go: (page: string) => void; WeekHeader: ComponentType<HeaderVariantProps>; Today: ComponentType<TodayProps>; Rest: ComponentType<RestProps>; Notices: NoticeVariant }) {
  const preview = view.week === "preview";
  const todayIndex = DAY_KEYS.indexOf(view.today);
  const today = preview ? null : week.days[todayIndex]!;
  const [guide, setGuide] = useState<OpenGuide | null>(null);
  const openGuide = (activity: Activity, day: Day, opener: HTMLElement) =>
    setGuide((prev) => ({ key: (prev?.key ?? 0) + 1, activity, day, opener, open: true }));
  const root = useRef<HTMLDivElement>(null);
  const link = preview ? undefined : LINKED[view.enter];
  const linkedDay = link === undefined ? undefined : week.days.find((d) => d.activities.some((x) => x.id === link && x.guide));
  const opened = useRef(false);

  // A drill link opens that drill's setup guide on arrival, as if its Set up was pressed. The frame renders this content
  // once per layout, so only the copy on screen opens it.
  useEffect(() => {
    if (opened.current || !linkedDay || !root.current?.checkVisibility()) return;
    opened.current = true;
    const activity = linkedDay.activities.find((x) => x.id === link)!;
    const opener = root.current.querySelector<HTMLElement>(`[data-setup="${link}"]`);
    if (opener) openGuide(activity, linkedDay, opener);
  });

  if (view.week === "held" || view.week === "heldpreview") return <Notices.Held view={view} week={week} go={go} />;

  const rest = <Rest week={week} today={today} done={preview ? NO_TICKS : done} toggle={toggle} preview={preview} onSetUp={openGuide} openId={guide?.open ? guide.activity.id : null} />;
  const days = (
    <div className="flex flex-col gap-6">
      {link !== undefined && !linkedDay && (
        <p role="status" className="flex gap-2 rounded-lg border border-vellum-line bg-paper px-4 py-3 text-small text-ink shadow-control">
          <Icon name="info" className="mt-px size-4 shrink-0 text-smoke" />That drill is not in this week.
        </p>
      )}
      {today && <Today day={today} next={nextStudyDay(week, today)} done={done} toggle={toggle} onSetUp={openGuide} openId={guide?.open ? guide.activity.id : null} />}
      {rest}
      {guide?.activity.guide && (
        <DrillSetupGuide key={guide.key} open={guide.open} returnFocusTo={guide.opener} onClose={() => setGuide((g) => g && { ...g, open: false })}
          day={DAY_NAMES[guide.day.key]} label={guide.activity.label} guide={guide.activity.guide} />
      )}
    </div>
  );

  return (
    <div ref={root} className="flex flex-col gap-6">
      {view.week === "upload" && <Notices.Upload view={view} week={week} go={go} />}
      <WeekHeader view={view} week={week} done={done} preview={preview} days={days} go={go} />
    </div>
  );
}

type StandInPage = { title: string; note: string; back?: string };
const STAND_INS: Record<string, StandInPage> = {
  upload: { title: "Weekly upload", note: "Today's Weekly upload page, in the new frame. Its content does not change in this round." },
  progress: { title: "Progress", note: "Today's Progress page, in the new frame. Its content does not change in this round." },
  settings: { title: "Study settings", note: "Today's Study settings page, in the new frame. Its content does not change in this round." },
  account: { title: "Account", note: "Today's Account page, in the new frame. Its content does not change in this round." },
  plan: { title: "Plan choice", note: "Today's Plan choice page. A lapsed student picks a plan here, then Stripe Checkout sends them back to This week.", back: "Pay with Stripe Checkout" },
  card: { title: "Update your card", note: "Stripe's billing page. Stripe sends the student back to This week.", back: "Return to DrillMap" },
  admin: { title: "Admin", note: "Today's Admin page, in the new frame." },
};
// The note a redirect adds on the page it lands on.
const LANDED: Partial<Record<Enter, [string, string]>> = {
  history: ["progress", "Opened from an old This week link (?historyWeek=2026-11-02). Progress shows the week of November 2."],
  noschedule: ["upload", "This week sent you here: there is no weekly schedule yet."],
};

export function StandIn({ page, surface, go, enter }: { page: string; surface: Surface; go: (page: string) => void; enter: Enter }) {
  const s = STAND_INS[page] ?? { title: page, note: "" };
  const landed = LANDED[enter]?.[0] === page ? LANDED[enter][1] : null;
  return (
    <div className="flex flex-col gap-4">
      <p className="w-fit rounded-pill bg-vellum-line/60 px-3 py-1 text-caption text-smoke">Stand-in page</p>
      <h1 className="text-h3 font-semibold text-ink">{s.title}</h1>
      <div className={cx(card(surface), "flex flex-col items-start gap-4 p-6 text-body text-smoke")}>
        {landed && <p className="text-ink">{landed}</p>}
        <p>{s.note}</p>
        {s.back && <Button onClick={() => go("thisweek")}>{s.back}</Button>}
      </div>
    </div>
  );
}
