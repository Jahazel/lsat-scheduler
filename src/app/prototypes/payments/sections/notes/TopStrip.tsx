"use client";

import { cx } from "@/components/ui/classes";
import type { PlanNote } from "../../protoData";
import { NoteAction, NoteGlyph, WeekPage, useWeek } from "./week";

export const SAVED_FOR_PAYMENT = "Your week is saved. It appears as soon as you pick a plan.";

export default function TopStrip() {
  const { note, state } = useWeek();
  return (
    <WeekPage
      above={<Strip note={note} waiting={state === "held"} />}
      lead={state === "held" ? "Check-ins open when your week appears." : state === "lapsed-failed" ? SAVED_FOR_PAYMENT : undefined}
    />
  );
}

function Strip({ note, waiting }: { note: PlanNote; waiting: boolean }) {
  return (
    <aside
      aria-label="Your plan"
      className={cx(
        "flex flex-col items-start gap-2.5 border-b px-5 py-3.5 text-small text-ink md:min-h-12 md:flex-row md:items-center md:justify-center md:gap-3 md:px-18 md:py-2 md:text-body",
        note.tone === "warning" ? "border-warning-line bg-warning-wash" : "border-vellum-line bg-vellum",
      )}
    >
      <p className="flex items-start gap-2.5 md:items-center">
        <NoteGlyph tone={note.tone} waiting={waiting} className="mt-px md:mt-0" />
        <span>
          <span className="font-medium">{note.lead}</span> {note.rest}
        </span>
      </p>
      {note.action && <span className="pl-7 md:pl-0"><NoteAction action={note.action} look="link" /></span>}
    </aside>
  );
}
