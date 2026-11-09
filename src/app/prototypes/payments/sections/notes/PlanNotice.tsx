"use client";

import { cx } from "@/components/ui/classes";
import type { PlanNote } from "../../protoData";
import { NoteAction, NoteGlyph } from "./week";

/** The picked Notice card: the note's first sentence as its title, the rest below, and its button on the right (below on phones). */
export function PlanNotice({ note, label = "Your plan", glyph = true }: { note: PlanNote; label?: string; glyph?: boolean }) {
  return (
    <section
      aria-label={label}
      className={cx(
        "flex flex-col gap-4 rounded-md border p-5 md:flex-row md:items-center md:gap-6",
        note.tone === "warning" ? "border-warning-line bg-warning-wash" : "border-transparent bg-vellum",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {glyph && <NoteGlyph tone={note.tone} className="mt-[3px]" />}
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h6 font-medium text-ink">{note.lead}</h2>
          {note.rest && <p className="text-small text-smoke">{note.rest}</p>}
        </div>
      </div>
      {note.action && <div className={cx(glyph && "pl-[30px] md:pl-0")}><NoteAction action={note.action} /></div>}
    </section>
  );
}
