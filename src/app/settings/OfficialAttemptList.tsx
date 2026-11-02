"use client";

import { useEffect, useRef, useState } from "react";
import { FieldMessage } from "@/components/StudyProfileFields";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { attemptMonths, MAX_OFFICIAL_ATTEMPTS } from "@/lib/studentProfile";

export type AttemptDraft = { id: number; score: string; month: string };
export type AttemptMessage = { box: "score" | "month"; text: string };

const LEAVE_MS = 120;
const BOX = `h-10 rounded-sm border bg-paper px-3 text-body text-ink ${FOCUS}`;
const box = (invalid: boolean) => cx(BOX, invalid ? "border-danger" : "border-vellum-line");

type Leaving = { row: AttemptDraft; index: number };

export function OfficialAttemptList({
  rows,
  nextId,
  today,
  messages,
  onEdit,
  onAdd,
  onRemove,
}: {
  rows: AttemptDraft[];
  nextId: number;
  today: string;
  messages: Partial<Record<number, AttemptMessage>> | undefined;
  onEdit: (id: number, values: Partial<Pick<AttemptDraft, "score" | "month">>) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState<ReadonlySet<number>>(new Set());
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const pendingFocus = useRef<string | null>(null);
  const months = attemptMonths(today);

  const shown: { row: AttemptDraft; leaving: boolean }[] = rows.map((row) => ({ row, leaving: false }));
  for (const gone of leaving) shown.splice(Math.min(gone.index, shown.length), 0, { row: gone.row, leaving: true });

  useEffect(() => {
    if (!pendingFocus.current) return;
    list.current?.querySelector<HTMLElement>(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  function add() {
    pendingFocus.current = `[data-attempt-score="${nextId}"]`;
    setAdded((ids) => new Set(ids).add(nextId));
    onAdd();
  }

  function remove(row: AttemptDraft) {
    const index = rows.indexOf(row);
    const next = rows[index + 1];
    setLeaving((list) => [...list, { row, index }]);
    onRemove(row.id);
    setTimeout(() => {
      pendingFocus.current = next ? `[data-attempt-remove="${next.id}"]` : "[data-attempt-add]";
      setLeaving((list) => list.filter((gone) => gone.row.id !== row.id));
    }, LEAVE_MS);
  }

  return (
    <div ref={list} className="flex flex-col gap-2 lg:max-w-[640px]">
      <div className="flex flex-col items-start gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3">
        <span className="text-small font-medium text-ink">Official LSAT attempts</span>
        <span className="text-caption text-smoke">For your record. It does not change your plan.</span>
      </div>
      {shown.length === 0 ? (
        <p className="py-1 text-small text-smoke">No official attempts yet</p>
      ) : (
        <div className="flex flex-col rounded-sm border border-vellum-line">
          {shown.map(({ row, leaving }, index) => {
            const message = leaving ? undefined : messages?.[row.id];
            const messageId = `attempt-${row.id}-message`;
            const invalid = (part: AttemptMessage["box"]) => message?.box === part;
            const position = index + 1;
            return (
              <div
                key={row.id}
                data-added={added.has(row.id) || undefined}
                data-leaving={leaving || undefined}
                inert={leaving}
                className="attempt-row flex flex-col gap-2 border-vellum-line py-2 pr-2 pl-3 not-last:border-b"
              >
                <div className="flex items-center gap-3">
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Attempt ${position} score`}
                    data-attempt-score={row.id}
                    value={row.score}
                    onChange={(e) => onEdit(row.id, { score: e.target.value })}
                    aria-invalid={invalid("score") || undefined}
                    aria-describedby={invalid("score") ? messageId : undefined}
                    className={cx(box(invalid("score")), "w-24 shrink-0")}
                  />
                  <select
                    aria-label={`Attempt ${position} month and year`}
                    value={row.month}
                    onChange={(e) => onEdit(row.id, { month: e.target.value })}
                    aria-invalid={invalid("month") || undefined}
                    aria-describedby={invalid("month") ? messageId : undefined}
                    className={cx(box(invalid("month")), "min-w-0 flex-1")}
                  >
                    <option value="" disabled>
                      Month and year
                    </option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove attempt ${position}`}
                    data-attempt-remove={row.id}
                    onClick={() => remove(row)}
                    className={cx("grid size-10 shrink-0 place-items-center rounded-pill text-smoke hover:bg-vellum", MOTION, FOCUS)}
                  >
                    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                    </svg>
                  </button>
                </div>
                {message && (
                  <FieldMessage id={messageId} icon>
                    {message.text}
                  </FieldMessage>
                )}
              </div>
            );
          })}
        </div>
      )}
      {rows.length < MAX_OFFICIAL_ATTEMPTS ? (
        <button
          type="button"
          data-attempt-add
          onClick={add}
          className={cx("flex items-center gap-2 self-start pt-1 text-small font-medium text-ink underline underline-offset-[3px]", FOCUS)}
        >
          <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2.5v9M2.5 7h9" />
          </svg>
          Add attempt
        </button>
      ) : (
        <p className="pt-1 text-caption text-smoke">You can record up to 10 attempts.</p>
      )}
    </div>
  );
}
