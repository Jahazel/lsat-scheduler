"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/nav/shared";
import { cx } from "@/components/ui/classes";
import type { Page } from "../view";
import { AvatarMenu, COLUMN, PRESS, StudentPhoneTabs, adminTab, studentTabsFor, type FrameProps } from "./chrome";

type TabIcon = "students" | "lab";
const ADMIN_TABS: { page: Page; label: string; short: string; icon: TabIcon }[] = [
  { page: "students", label: "Students", short: "Students", icon: "students" },
  { page: "lab", label: "Schedule lab", short: "Lab", icon: "lab" },
];

const ICONS: Record<TabIcon, ReactNode> = {
  students: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 15.4c1.8.7 3 2.2 3.5 4.6" /></>,
  lab: <><path d="M9.5 3.5h5M10.5 3.5v6L5.2 18.7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.3-2.3L13.5 9.5v-6M7.6 15h8.8" /></>,
};

function TabGlyph({ icon, className = "size-5" }: { icon: TabIcon; className?: string }) {
  return <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cx("shrink-0", className)}>{ICONS[icon]}</svg>;
}

function BarTabs({ page, go }: Pick<FrameProps, "page" | "go">) {
  const current = adminTab(page);
  return (
    <nav aria-label="Admin" className="flex gap-1">
      {ADMIN_TABS.map((t) => {
        const on = t.page === current;
        return (
          <button key={t.page} type="button" aria-current={on ? "page" : undefined} onClick={() => go(t.page)}
            className={cx("flex h-10 items-center rounded-pill px-4 text-small whitespace-nowrap pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS, on ? "bg-vellum font-medium text-ink" : "text-smoke")}>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function PhoneTabs({ page, go }: Pick<FrameProps, "page" | "go">) {
  const current = adminTab(page);
  return (
    <nav aria-label="Admin" className="fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-40 grid grid-cols-2 rounded-lg border border-vellum-line bg-paper p-1 shadow-e1 md:hidden">
      {ADMIN_TABS.map((t) => {
        const on = t.page === current;
        return (
          <button key={t.page} type="button" aria-current={on ? "page" : undefined} onClick={() => go(t.page)}
            className={cx("flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-caption", PRESS, on ? "bg-vellum font-medium text-ink" : "text-smoke")}>
            <TabGlyph icon={t.icon} />
            {t.short}
          </button>
        );
      })}
    </nav>
  );
}

function ModeSwitch({ side, go, backToAdmin, walk, walkTrigger }: { side: boolean; go: FrameProps["go"]; backToAdmin: () => void; walk: FrameProps["walk"]; walkTrigger: FrameProps["walkTrigger"] }) {
  const student = side ? walk : undefined;
  const control = (
    <div role="group" aria-label="Side" className="relative grid shrink-0 grid-cols-2 rounded-pill bg-vellum p-1 text-small">
      <span aria-hidden className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-pill bg-paper shadow-control transition-transform duration-(--duration-base) ease-(--ease-in-out-strong) motion-reduce:transition-none"
        style={{ transform: side ? "translateX(100%)" : "none" }} />
      <button type="button" aria-pressed={!side} onClick={() => side && backToAdmin()} className={cx("relative h-8 rounded-pill px-3 lg:px-4", PRESS, side ? "text-smoke pointer-hover:hover:text-ink" : "font-medium text-ink")}>Admin</button>
      {student ? (
        <button ref={walkTrigger} type="button" aria-pressed aria-expanded={student.expanded} aria-controls="walkthrough" aria-label={student.name} onClick={student.toggle}
          className={cx("relative flex h-8 items-center justify-center gap-1.5 rounded-pill px-3 font-medium whitespace-nowrap text-ink lg:px-4", PRESS)}>
          {student.label}
        </button>
      ) : (
        <button type="button" aria-pressed={side} onClick={() => !side && go("side")} className={cx("relative h-8 rounded-pill px-3 whitespace-nowrap lg:px-4", PRESS, side ? "font-medium text-ink" : "text-smoke pointer-hover:hover:text-ink")}>
          <span className="xl:hidden">Student</span><span className="hidden xl:inline">Student side</span>
        </button>
      )}
    </div>
  );
  return student ? student.wrap(control) : control;
}

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

export function AdminFrame({ admin, page, go, backToAdmin, content, walk, walkTrigger, pages }: FrameProps) {
  const side = page === "side";
  const studentTabs = studentTabsFor(pages);
  const realPages = side && !!walk;
  const wide = useWide();
  const phoneWalk = wide ? null : walk;
  const deskWalk = wide ? walk : null;
  return (
    <div className={cx("bg-vellum", realPages ? "flex h-dvh flex-col" : "min-h-dvh")}>
      <header className="sticky top-0 z-40 shrink-0 border-b border-vellum-line bg-paper/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5 md:hidden">
          <span className="shrink-0"><Logo href="#" form="mark" /></span>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2"><ModeSwitch side={side} go={go} backToAdmin={backToAdmin} walk={phoneWalk} walkTrigger={walkTrigger} /><AvatarMenu admin={admin} compact /></div>
        </div>
        <div className={cx("hidden h-18 items-center justify-between gap-3 md:flex lg:gap-6", COLUMN)}>
          <div className="flex min-w-0 items-center gap-3 lg:gap-8">
            <span className="lg:hidden"><Logo href="#" form="mark" /></span>
            <span className="hidden lg:block"><Logo href="#" /></span>
            {side ? (
              studentTabs && <nav aria-label="Student pages" className="flex gap-1">
                {studentTabs.map((t) => (
                  <button key={t.href} type="button" aria-current={t.current ? "page" : undefined} onClick={t.open}
                    className={cx("flex h-10 items-center rounded-pill px-4 text-small whitespace-nowrap pointer-hover:hover:bg-vellum pointer-hover:hover:text-ink", PRESS, t.current ? "bg-vellum font-medium text-ink" : "text-smoke")}>
                    <span className="lg:hidden">{t.short}</span><span className="hidden lg:inline">{t.label}</span>
                  </button>
                ))}
              </nav>
            ) : <BarTabs page={page} go={go} />}
          </div>
          <div className="flex items-center gap-2 lg:gap-3"><ModeSwitch side={side} go={go} backToAdmin={backToAdmin} walk={deskWalk} walkTrigger={walkTrigger} /><AvatarMenu admin={admin} compact={false} /></div>
        </div>
      </header>
      {realPages
        ? <main className="flex min-h-0 flex-1 flex-col">{content}</main>
        : <main className={cx("flex flex-col gap-6 pt-6 pb-28 md:pt-10 md:pb-12", COLUMN)}>{content}</main>}
      {side ? <StudentPhoneTabs pages={pages} /> : <PhoneTabs page={page} go={go} />}
    </div>
  );
}
