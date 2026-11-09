"use client";

import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/classes";
import { NoteAction, NoteGlyph, WeekPage, useWeek } from "./week";

export default function NoticeCard() {
  const { note, state } = useWeek();
  const held = state === "held";
  const notice = !held && (
    <section
      aria-label="Your plan"
      className={cx(
        "flex flex-col gap-4 rounded-md border p-5 md:flex-row md:items-center md:gap-6",
        note.tone === "warning" ? "border-warning-line bg-warning-wash" : "border-transparent bg-vellum",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <NoteGlyph tone={note.tone} className="mt-[3px]" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h6 font-medium text-ink">{note.lead}</h2>
          <p className="text-small text-smoke">{note.rest}</p>
        </div>
      </div>
      {note.action && <div className="pl-[30px] md:pl-0"><NoteAction action={note.action} look="button" /></div>}
    </section>
  );
  const waiting = held
    ? { title: note.lead, body: note.rest }
    : { title: "Your week is saved.", body: "It appears as soon as you pick a plan." };
  return (
    <WeekPage
      beforeDays={notice}
      empty={
        <Card className="items-center gap-3 px-6 py-14 text-center md:py-20">
          <ClockMark />
          <h2 className="text-h5 font-medium text-ink">{waiting.title}</h2>
          <p className="max-w-[36ch] text-small text-smoke">{waiting.body}</p>
        </Card>
      }
    />
  );
}

function ClockMark() {
  return (
    <span className="mb-1 flex size-12 items-center justify-center rounded-pill bg-vellum text-smoke">
      <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    </span>
  );
}
