"use client";

import { useId, useState, type ReactNode } from "react";
import {
  AddType, ReviewCheckbox, ScreenshotCard, TIER_LABEL,
  boxId, statementId, tierId, useDeferWhilePointerDown, useFocusAfterRender,
} from "@/components/SnapshotReviewFields";
import { TAP_AREA, FOCUS, cx } from "@/components/ui/classes";
import { SECTION_NAME, accuracyError, isTyped, lowestPassageType, type ReviewRow, type Statement } from "@/lib/analyticsReview";
import { accuracyMessage, boxText, emptyListNote, tierMessage, type ReviewAction, type ReviewDraft, type ReviewList } from "@/lib/reviewDraft";
import { PRIORITY_TIERS, isTopPriorityTier, type AnalyticsExtractedRow, type AnalyticsSection, type LRType, type PriorityTier } from "@/lib/types";

type Dispatch = (action: ReviewAction) => void;

const CAPTION = "text-caption text-smoke";
const LINK = cx("font-medium text-ink underline underline-offset-[3px]", FOCUS);

export function ReviewBars({ draft, lrRead, files, dispatch }: {
  draft: ReviewDraft;
  lrRead: AnalyticsExtractedRow[];
  files: Partial<Record<AnalyticsSection, File>>;
  dispatch: Dispatch;
}) {
  const requestFocus = useFocusAfterRender();
  const deferWhilePointerDown = useDeferWhilePointerDown();
  const { review } = draft;
  const typed = isTyped(review);
  const accuracyRows = review.rows.filter(({ row }) => row.category === "regular");
  const flagRows = review.rows.flatMap(({ row }) => (row.category === "restricted" ? [row] : []));
  const passageRows = review.rows.filter(({ row }) => row.category === "passage");
  const goesFirst = lowestPassageType(review);

  const barRow = (entry: ReviewRow) => (
    <BarRow
      key={entry.row.type}
      entry={entry}
      typed={typed}
      goesFirst={entry.row.type === goesFirst}
      text={boxText(draft, entry.row.type)}
      message={accuracyMessage(draft, entry.row.type)}
      dispatch={dispatch}
      onLeave={() => deferWhilePointerDown(() => dispatch({ type: "leaveRow", rowType: entry.row.type }))}
    />
  );
  const emptyNote = (list: ReviewList) => {
    const note = emptyListNote(draft, lrRead, list);
    return note && <p className="py-2 text-small text-ink">{note}</p>;
  };

  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionHead section="LR" file={typed ? undefined : files.LR} />
        <p className={CAPTION}>
          {typed ? "Add each question type with its accuracy." : "Same order as your screenshot · grey shows the value we read before you changed it"}
        </p>
        {typed && accuracyRows.length + flagRows.length === 0 && (
          <div className="flex flex-col gap-1 py-2 text-small">
            <p className="text-ink">No question types yet.</p>
            <p className="text-smoke">Add each type your Analytics page lists. Type its percentage, or pick its tier when 7Sage ranks it instead.</p>
          </div>
        )}
        {accuracyRows.length > 0 && <div className="flex flex-col gap-1">{accuracyRows.map(barRow)}</div>}
        {!typed && emptyNote("accuracy")}
        {typed && flagRows.length > 0 && (
          <>
            <p className={cx(CAPTION, "pt-4")}>Priority tier · types 7Sage ranks instead · Highest and High go first in your plan</p>
            <div className="flex flex-col">
              {flagRows.map((row) => (
                <TierRow
                  key={row.type}
                  type={row.type}
                  tier={row.priorityTier}
                  message={tierMessage(draft, row.type)}
                  onTier={(tier) => dispatch({ type: "setTier", rowType: row.type, tier })}
                  onRemove={() => dispatch({ type: "removeRow", rowType: row.type })}
                  onLeave={() => deferWhilePointerDown(() => dispatch({ type: "leaveRow", rowType: row.type }))}
                />
              ))}
            </div>
          </>
        )}
        <AddType
          draft={draft}
          typed={typed}
          linkClassName={TAP_AREA}
          onAdd={(type, list) => {
            dispatch({ type: "addType", rowType: type });
            if (list === "accuracy") requestFocus(boxId(type));
            else if (typed) requestFocus(tierId(type));
          }}
        />
        {!typed && (
          <>
            <p className={cx(CAPTION, "pt-4")}>Priority flags · switched-on flags go first</p>
            <div className="flex flex-col">
              {flagRows.map((row) => (
                <FlagSwitch
                  key={row.type}
                  type={row.type}
                  tier={row.priorityTier}
                  on={row.isTopPriority ?? false}
                  onToggle={() => dispatch({ type: "toggleFlag", rowType: row.type })}
                />
              ))}
            </div>
            {emptyNote("flags")}
          </>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <SectionHead section="RC" file={typed ? undefined : files.RC} />
        <p className={CAPTION}>
          {typed
            ? "Leave a box empty if 7Sage shows no percentage · the lowest, in dark blue, goes first in your plan"
            : "The lowest passage type, in dark blue, goes first in your plan"}
        </p>
        <div className="flex flex-col gap-1">{passageRows.map(barRow)}</div>
      </section>
    </>
  );
}

export function ReviewStatementList({ draft, statements, dispatch }: {
  draft: ReviewDraft;
  statements: { statement: Statement; text: string }[];
  dispatch: Dispatch;
}) {
  return (
    <fieldset className="flex flex-col gap-1 border-t border-vellum-line pt-4">
      <legend className="sr-only">Confirm your analytics</legend>
      {statements.map(({ statement, text }, index) => (
        <ReviewCheckbox
          key={statement}
          id={statementId(index)}
          checked={draft.review.confirmation[statement]}
          onChange={(checked) => dispatch({ type: "setStatement", statement, checked, at: new Date() })}
          className="min-h-11 py-1.5"
        >
          {text}
        </ReviewCheckbox>
      ))}
    </fieldset>
  );
}

function SectionHead({ section, file }: { section: AnalyticsSection; file: File | undefined }) {
  const [open, setOpen] = useState(false);
  const imageId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-body font-semibold text-ink">{SECTION_NAME[section]}</h2>
        {file && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? imageId : undefined}
            onClick={() => setOpen((shown) => !shown)}
            className={cx("shrink-0 text-caption", TAP_AREA, LINK)}
          >
            {`${open ? "Hide" : "Show"} screenshot `}
            <span className="sr-only">{`of ${SECTION_NAME[section]}`}</span>
          </button>
        )}
      </div>
      {file && open && (
        <div id={imageId}>
          <ScreenshotCard section={section} file={file} />
        </div>
      )}
    </div>
  );
}

function BarRow({ entry, typed, goesFirst, text, message, dispatch, onLeave }: {
  entry: ReviewRow;
  typed: boolean;
  goesFirst: boolean;
  text: string;
  message: string | null;
  dispatch: Dispatch;
  onLeave: () => void;
}) {
  const { row, original } = entry;
  const id = boxId(row.type);
  const was = original?.accuracy !== undefined && original.accuracy !== row.accuracy ? original.accuracy : null;
  const added = original === null && !typed && row.category !== "passage";
  const changed = added || was !== null;
  const value = accuracyError(row) ? 0 : (row.accuracy ?? 0);
  const note: ReactNode = message ? (
    <span id={`${id}-message`} className="text-caption text-danger-ink">{message}</span>
  ) : was !== null ? (
    <span className="text-caption text-accent">{`Was ${was}%`}</span>
  ) : added ? (
    <span className="text-caption text-accent">Added by you</span>
  ) : null;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-baseline gap-x-2 text-small text-ink">
            <label htmlFor={id} className="[overflow-wrap:anywhere]">{row.type}</label>
            {goesFirst && <span className="text-caption font-medium text-accent">Goes first</span>}
          </span>
          {note}
        </span>
        <label
          htmlFor={id}
          className={cx(
            "flex h-9 w-[72px] shrink-0 items-center rounded-sm border bg-paper pr-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
            TAP_AREA,
            message ? "border-danger" : changed ? "border-accent" : "border-vellum-line",
          )}
        >
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`${row.type} accuracy`}
            value={text}
            onChange={(e) => dispatch({ type: "editAccuracy", rowType: row.type, text: e.target.value })}
            onBlur={onLeave}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            className="h-full w-full min-w-0 bg-transparent pr-0.5 text-right text-body tabular-nums text-ink outline-none"
          />
          <span aria-hidden className="text-small text-smoke">%</span>
        </label>
        {row.category === "passage" ? (
          <span aria-hidden className="-mx-1.5 size-11 shrink-0" />
        ) : (
          <RemoveButton type={row.type} onRemove={() => dispatch({ type: "removeRow", rowType: row.type })} />
        )}
      </div>
      <span aria-hidden className="relative h-1.5 rounded-full bg-vellum">
        {was !== null && <span className="absolute inset-y-0 left-0 rounded-full bg-fog/35" style={{ width: `${Math.min(was, 100)}%` }} />}
        <span
          className={cx(
            "absolute inset-0 rounded-full transition-[clip-path] duration-(--duration-fast) ease-(--ease-out-strong) motion-reduce:transition-none",
            goesFirst ? "bg-accent" : "bg-accent/45",
          )}
          style={{ clipPath: `inset(0 ${100 - value}% 0 0 round 9999px)` }}
        />
      </span>
    </div>
  );
}

function RemoveButton({ type, onRemove }: { type: LRType; onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${type}`}
      onClick={onRemove}
      className={cx("-mx-1.5 grid size-11 shrink-0 place-items-center rounded-full text-smoke hover:text-ink", FOCUS)}
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    </button>
  );
}

function FlagSwitch({ type, tier, on, onToggle }: { type: LRType; tier: PriorityTier | undefined; on: boolean; onToggle: () => void }) {
  const nameId = useId();
  const tierTextId = useId();
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1.5">
      <span id={nameId} className="min-w-0 flex-1 text-small text-ink [overflow-wrap:anywhere]">{type}</span>
      {tier && (
        <span id={tierTextId} className={cx("shrink-0 rounded-full px-2 py-0.5 text-caption", tier && isTopPriorityTier(tier) ? "bg-accent/8 font-medium text-accent" : "bg-vellum text-smoke")}>
          {`${TIER_LABEL[tier]} `}
          <span className="sr-only">on 7Sage</span>
        </span>
      )}
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={onToggle}
        aria-labelledby={nameId}
        aria-describedby={tier ? tierTextId : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 rounded-full bg-vellum-line transition-colors duration-(--duration-fast) ease-out peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow-e1 after:transition-transform after:duration-(--duration-fast) after:ease-(--ease-out-strong) peer-checked:after:translate-x-4"
      />
    </label>
  );
}

function TierRow({ type, tier, message, onTier, onRemove, onLeave }: {
  type: LRType;
  tier: PriorityTier | undefined;
  message: string | null;
  onTier: (tier: PriorityTier) => void;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const id = tierId(type);
  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onLeave();
      }}
      className="flex flex-col gap-1.5 py-2"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1 text-small text-ink [overflow-wrap:anywhere]">{type}</span>
        <div className="flex items-center gap-3">
          <div
            role="radiogroup"
            aria-label={`${type} tier`}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            className={cx("flex w-[196px] shrink-0 gap-0.5 rounded-sm border bg-vellum p-0.5", message ? "border-danger" : "border-transparent")}
          >
            {PRIORITY_TIERS.map((option, index) => (
              <label
                key={option}
                className={cx(
                  "flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[4px] text-caption has-checked:bg-paper has-checked:font-semibold has-checked:shadow-control has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
                  TAP_AREA,
                  tier === option ? (isTopPriorityTier(option) ? "text-accent" : "text-ink") : "text-smoke hover:text-ink",
                )}
              >
                <input
                  id={index === 0 ? id : undefined}
                  type="radio"
                  name={id}
                  value={option}
                  checked={tier === option}
                  onChange={() => onTier(option)}
                  className="sr-only"
                />
                {TIER_LABEL[option]}
              </label>
            ))}
          </div>
          <RemoveButton type={type} onRemove={onRemove} />
        </div>
      </div>
      {message && <p id={`${id}-message`} className="text-caption text-danger-ink">{message}</p>}
    </div>
  );
}
