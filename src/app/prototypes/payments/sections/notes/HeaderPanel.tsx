"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { cx } from "@/components/ui/classes";
import { plansFor, type WeekState } from "../../protoData";
import { SAVED_FOR_PAYMENT } from "./TopStrip";
import { NoteAction, NoteGlyph, WeekPage, useWeek } from "./week";

const STATUS: Record<WeekState, string> = {
  "free-friday": "Free week",
  "free-sunday": "Free week",
  "free-cancelled": "Free week · cancelled",
  "free-saved": "Free week",
  held: "First payment pending",
  retrying: "Retrying",
  "lapsed-failed": "Lapsed",
  "lapsed-ended": "Lapsed",
};

export default function HeaderPanel() {
  const { note, state, data, days, done, total, dueSoFar } = useWeek();
  const plan = plansFor(data.prices)[data.plan];
  const panel = (
    <section
      aria-label="Your plan"
      className={cx(
        "flex flex-col gap-3 rounded-md border p-4",
        note.tone === "warning" ? "border-warning-line bg-warning-wash" : "border-vellum-line bg-paper",
      )}
    >
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-label uppercase text-smoke *:whitespace-nowrap">
        <span>{state.startsWith("lapsed") ? "No plan" : `${plan.name} · ${plan.price} ${plan.per}`}</span>
        <span className={cx("flex items-center gap-1.5 text-right", note.tone === "warning" && "text-warning-ink")}>
          {note.tone === "warning" && <NoteGlyph tone="warning" className="size-3.5" />}
          {STATUS[state]}
        </span>
      </p>
      <p className="text-small text-smoke">
        <span className="font-medium text-ink">{note.lead}</span> {note.rest}
      </p>
      {note.action && <span className="flex"><NoteAction action={note.action} look="button" /></span>}
    </section>
  );
  const progress = days !== "none" && <ProgressBar done={done} total={total} dueSoFar={dueSoFar} />;
  return (
    <WeekPage
      lead={state === "lapsed-failed" ? SAVED_FOR_PAYMENT : undefined}
      aside={<div className="flex flex-col gap-6">{progress}{panel}</div>}
    />
  );
}
