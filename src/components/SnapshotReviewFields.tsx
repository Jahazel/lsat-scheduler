"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Checkbox as SharedCheckbox } from "@/components/ui/Checkbox";
import { SECTION_NAME, isTyped, lowestPassageType, type ReviewRow, type Statement } from "@/lib/analyticsReview";
import {
  accuracyMessage, addTypeOptions, boxText, emptyListNote, listedTypes, tierMessage,
  type AnalyticsType, type ReviewAction, type ReviewDraft, type ReviewList,
} from "@/lib/reviewDraft";
import { isTopPriorityTier, PRIORITY_TIERS, type AnalyticsExtractedRow, type AnalyticsSection, type LRType, type PriorityTier } from "@/lib/types";
import { FOCUS } from "./ui/classes";


const LINK_BUTTON = `font-medium text-ink underline underline-offset-[3px] disabled:cursor-not-allowed disabled:no-underline ${FOCUS}`;
export const STEP_PRIMARY = `h-11 flex-1 rounded-sm bg-ink text-body font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised disabled:cursor-not-allowed disabled:bg-vellum-line disabled:text-smoke ${FOCUS}`;
export const STEP_SECONDARY = `h-11 w-28 shrink-0 rounded-sm border border-vellum-line bg-paper text-body font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum disabled:cursor-not-allowed disabled:text-fog ${FOCUS}`;

export const boxId = (type: AnalyticsType, prefix = "") => `${prefix}accuracy-${type.replace(/\W+/g, "-")}`;
export const statementId = (index: number) => `statement-${index}`;
export const tierId = (type: LRType, prefix = "") => `${prefix}tier-${type.replace(/\W+/g, "-")}`;
export const addTypeLinkId = (prefix = "") => `${prefix}add-type-link`;

const IdPrefix = createContext("");

export function useDeferWhilePointerDown() {
  const pressing = useRef(false);
  useEffect(() => {
    const down = () => {
      pressing.current = true;
    };
    const up = () => {
      pressing.current = false;
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
    };
  }, []);
  return (run: () => void) => {
    if (!pressing.current) return run();
    const ended = new AbortController();
    const finish = () => {
      ended.abort();
      setTimeout(run);
    };
    document.addEventListener("pointerup", finish, { capture: true, signal: ended.signal });
    document.addEventListener("pointercancel", finish, { capture: true, signal: ended.signal });
  };
}

export function useFocusAfterRender() {
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (!pending.current) return;
    document.getElementById(pending.current)?.focus();
    pending.current = null;
  });
  return (id: string) => {
    pending.current = id;
  };
}

export function ReviewLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-h-[38px] items-center gap-3 border-b border-vellum-line py-1 pl-3 pr-1 ${className}`}>{children}</div>;
}

export function ListCaption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-7 items-center border-b border-vellum-line px-3 py-1.5 text-caption text-smoke ${className}`}>{children}</div>
  );
}

export function ReviewCheckbox({
  id,
  checked,
  onChange,
  detail,
  className,
  children,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  detail?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  const detailId = useId();
  return (
    <SharedCheckbox
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-labelledby={labelId}
      aria-describedby={detail ? detailId : undefined}
      className={className}
      label={
        <>
          <span id={labelId} className="grow">
            {children}
          </span>
          {detail && <span id={detailId}>{detail}</span>}
        </>
      }
    />
  );
}

export function ReviewStatements({ draft, statements, dispatch }: {
  draft: ReviewDraft;
  statements: { statement: Statement; text: string }[];
  dispatch: (action: ReviewAction) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-sm bg-vellum px-4 py-3.5">
      {statements.map(({ statement, text }, index) => (
        <ReviewCheckbox
          key={statement}
          id={statementId(index)}
          checked={draft.review.confirmation[statement]}
          onChange={(checked) => dispatch({ type: "setStatement", statement, checked, at: new Date() })}
        >
          {text}
        </ReviewCheckbox>
      ))}
    </div>
  );
}

export function ConfirmBar({ label, saving, locked, note, onBack, onConfirm }: {
  label: string;
  saving: boolean;
  locked: boolean;
  note: ReactNode;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <button type="button" disabled={saving} onClick={onBack} className={STEP_SECONDARY}>
          Back
        </button>
        <button
          type="button"
          aria-disabled={locked && !saving ? true : undefined}
          disabled={saving}
          onClick={onConfirm}
          aria-describedby="confirm-note"
          className={`h-11 flex-1 rounded-sm text-body font-medium transition-colors duration-150 ease-out ${FOCUS} ${
            saving
              ? "cursor-wait bg-graphite-raised text-chalk"
              : locked
                ? "cursor-not-allowed bg-vellum-line text-smoke"
                : "bg-ink text-chalk hover:bg-graphite-raised"
          }`}
        >
          {saving ? "Saving…" : label}
        </button>
      </div>
      <p id="confirm-note" role="status" className="text-center text-small text-smoke">
        {note}
      </p>
    </div>
  );
}

export function SnapshotReviewFields({ idPrefix = "", ...props }: {
  draft: ReviewDraft;
  lrRead: AnalyticsExtractedRow[];
  files: Partial<Record<AnalyticsSection, File>>;
  dispatch: (action: ReviewAction) => void;
  idPrefix?: string;
}) {
  return (
    <IdPrefix.Provider value={idPrefix}>
      <ReviewFields {...props} />
    </IdPrefix.Provider>
  );
}

function ReviewFields({ draft, lrRead, files, dispatch }: {
  draft: ReviewDraft;
  lrRead: AnalyticsExtractedRow[];
  files: Partial<Record<AnalyticsSection, File>>;
  dispatch: (action: ReviewAction) => void;
}) {
  const prefix = useContext(IdPrefix);
  const requestFocus = useFocusAfterRender();
  const deferWhilePointerDown = useDeferWhilePointerDown();
  const { review } = draft;
  const accuracyRows = review.rows.filter(({ row }) => row.category === "regular");
  const flagRows = review.rows.filter(({ row }) => row.category === "restricted");
  const passageRows = review.rows.filter(({ row }) => row.category === "passage");
  const goesFirst = lowestPassageType(review);
  const typed = isTyped(review);

  const accuracyRow = (entry: ReviewRow, note: ReactNode = null) => (
    <AccuracyRow
      key={entry.row.type}
      entry={entry}
      text={boxText(draft, entry.row.type)}
      message={accuracyMessage(draft, entry.row.type)}
      note={note}
      dispatch={dispatch}
      onLeave={() => deferWhilePointerDown(() => dispatch({ type: "leaveRow", rowType: entry.row.type }))}
    />
  );
  const emptyNote = (list: ReviewList) => {
    const note = emptyListNote(draft, lrRead, list);
    return note && <p className="border-b border-vellum-line px-3 py-3.5 text-small text-ink">{note}</p>;
  };

  const addType = (
    <AddType
      draft={draft}
      typed={typed}
      onAdd={(type, list) => {
        dispatch({ type: "addType", rowType: type });
        if (list === "accuracy") requestFocus(boxId(type, prefix));
        else if (typed) requestFocus(tierId(type, prefix));
      }}
    />
  );
  const passages = (caption: string, file: File | undefined) => (
    <>
      <SectionHeading section="RC" file={file} />
      <div className="flex flex-col">
        <ListCaption>{caption}</ListCaption>
        {passageRows.map((entry) =>
          accuracyRow(
            entry,
            entry.row.type === goesFirst ? <span className="font-sans text-small text-accent">Goes first</span> : null,
          ),
        )}
      </div>
    </>
  );

  if (typed) {
    return (
      <>
        <SectionHeading section="LR" file={undefined} />
        {accuracyRows.length + flagRows.length === 0 && (
          <div className="flex flex-col">
            <ListCaption>Question types · from your Analytics page</ListCaption>
            <div className="flex flex-col gap-1 border-b border-vellum-line px-3 py-3.5 text-small">
              <p className="text-ink">No question types yet.</p>
              <p className="text-smoke">Add each type your Analytics page lists. Type its percentage, or pick its tier when 7Sage ranks it instead.</p>
            </div>
          </div>
        )}
        {accuracyRows.length > 0 && (
          <div className="flex flex-col">
            <ListCaption>Accuracy · types with a percentage</ListCaption>
            {accuracyRows.map((entry) => accuracyRow(entry))}
          </div>
        )}
        {flagRows.length > 0 && (
          <div className="flex flex-col">
            <ListCaption>Priority tier · types 7Sage ranks instead · Highest and High go first in your plan</ListCaption>
            {flagRows.map(({ row }) => row.category === "restricted" && (
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
        )}
        {addType}
        {passages("Passage types · leave a box empty if 7Sage shows no percentage", undefined)}
      </>
    );
  }

  return (
    <>
      <SectionHeading section="LR" file={files.LR} />
      <div className="flex flex-col">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-vellum-line px-3 py-1.5 text-caption text-smoke">
          <span>
            Accuracy · {accuracyRows.length} {accuracyRows.length === 1 ? "type" : "types"}
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-dashed border-accent" />
              Read from screenshot
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border border-ink" />
              Edited by you
            </span>
          </span>
        </div>
        {accuracyRows.map((entry) => accuracyRow(entry))}
        {emptyNote("accuracy")}
      </div>
      <div className="flex flex-col">
        <ListCaption>Priority flags · ticked flags go first in your plan</ListCaption>
        {flagRows.map(({ row }) => row.category === "restricted" && (
          <ReviewCheckbox
            key={row.type}
            checked={row.isTopPriority ?? false}
            onChange={() => dispatch({ type: "toggleFlag", rowType: row.type })}
            detail={row.priorityTier && <TierPill tier={row.priorityTier} />}
            className="min-h-9 border-b border-vellum-line px-3 py-1.5"
          >
            {row.type}
          </ReviewCheckbox>
        ))}
        {emptyNote("flags")}
      </div>
      {addType}
      {passages("Passage types · lowest goes first in your plan", files.RC)}
    </>
  );
}

function SectionHeading({ section, file }: { section: AnalyticsSection; file: File | undefined }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <h2 className="px-3 text-body font-semibold text-ink lg:px-3">{SECTION_NAME[section]}</h2>
      {file && <ScreenshotToggle section={section} file={file} />}
    </div>
  );
}

function AccuracyRow({
  entry,
  text,
  message,
  note,
  dispatch,
  onLeave,
}: {
  entry: ReviewRow;
  text: string;
  message: string | null;
  note: ReactNode;
  dispatch: (action: ReviewAction) => void;
  onLeave: () => void;
}) {
  const { row, original } = entry;
  const removable = row.category !== "passage";
  const edited = original === null || original.accuracy !== row.accuracy;
  const was = note ?? (edited && original?.accuracy !== undefined ? `was ${original.accuracy}%` : null);
  const id = boxId(row.type, useContext(IdPrefix));
  const box = message
    ? "border-danger bg-paper"
    : edited
      ? "border-ink bg-paper"
      : "border-dashed border-accent bg-accent/faint";

  return (
    <div className="flex flex-col border-b border-vellum-line focus-within:rounded-sm focus-within:border-transparent focus-within:bg-accent/faint focus-within:outline-[1.5px] focus-within:outline-accent focus-within:outline-solid">
      <div className="flex min-h-[38px] items-center gap-3 py-1 pl-3 pr-1">
        <label htmlFor={id} className="grow text-small text-ink">
          {row.type}
        </label>
        <span className="w-[72px] shrink-0 text-right font-mono text-caption text-smoke">{was}</span>
        <span className={`flex h-[30px] w-16 shrink-0 items-center rounded-sm border px-2 ${box}`}>
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
            className="w-full min-w-0 bg-transparent text-right font-mono text-mono text-ink outline-none"
          />
          <span aria-hidden className="pl-0.5 font-mono text-mono text-smoke">%</span>
        </span>
        {removable ? (
          <RemoveButton type={row.type} onRemove={() => dispatch({ type: "removeRow", rowType: row.type })} />
        ) : (
          <span aria-hidden className="size-7 shrink-0" />
        )}
      </div>
      {message && (
        <p id={`${id}-message`} className="px-3 pb-2 text-small text-danger-ink">
          {message}
        </p>
      )}
    </div>
  );
}

function RemoveButton({ type, onRemove }: { type: LRType; onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${type}`}
      onClick={onRemove}
      className={`grid size-7 shrink-0 place-items-center rounded text-smoke hover:text-ink ${FOCUS}`}
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
      </svg>
    </button>
  );
}

const TIER_LABEL: Record<PriorityTier, string> = { highest: "Highest", high: "High", medium: "Medium", low: "Low" };

function TierRow({ type, tier, message, onTier, onRemove, onLeave }: {
  type: LRType;
  tier: PriorityTier | undefined;
  message: string | null;
  onTier: (tier: PriorityTier) => void;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const id = tierId(type, useContext(IdPrefix));
  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onLeave();
      }}
      className="flex flex-col border-b border-vellum-line"
    >
      <div className="flex min-h-10 items-center gap-3 py-1 pl-3 pr-1">
        <span className="grow text-small text-ink">{type}</span>
        <div
          role="radiogroup"
          aria-label={`${type} tier`}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          className={`flex w-[196px] shrink-0 gap-0.5 rounded-sm border bg-vellum p-0.5 ${message ? "border-danger" : "border-transparent"}`}
        >
          {PRIORITY_TIERS.map((option, index) => (
            <label
              key={option}
              className={`flex h-[26px] flex-1 cursor-pointer items-center justify-center rounded-[4px] text-caption has-checked:bg-paper has-checked:font-semibold has-checked:shadow-control has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                tier === option ? (isTopPriorityTier(option) ? "text-accent" : "text-ink") : "text-smoke hover:text-ink"
              }`}
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
      {message && (
        <p id={`${id}-message`} className="px-3 pb-2 text-small text-danger-ink">
          {message}
        </p>
      )}
    </div>
  );
}

function TierPill({ tier }: { tier: PriorityTier }) {
  const top = isTopPriorityTier(tier);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 text-caption font-medium ${
        top ? "border-accent text-accent" : "border-fog text-smoke"
      }`}
    >
      {top && (
        <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="currentColor" stroke="currentColor" strokeLinejoin="round">
          <path d="M2 9V1.5h5.5L6.5 3.5l1 2H2" />
        </svg>
      )}
      {TIER_LABEL[tier]} on 7Sage
    </span>
  );
}

const ADD_TYPE_GROUPS: { list: ReviewList; label: string; typedLabel: string; none: string }[] = [
  { list: "accuracy", label: "Accuracy · you type the percentage", typedLabel: "Percentage · you type the accuracy", none: "No accuracy types match" },
  {
    list: "flags",
    label: "Priority flags · added unticked",
    typedLabel: "Tier · Stimulus Logic, you pick Highest, High, Medium, or Low",
    none: "No priority flags match",
  },
];

function AddType({
  draft,
  typed,
  onAdd,
}: {
  draft: ReviewDraft;
  typed: boolean;
  onAdd: (type: LRType, list: ReviewList) => void;
}) {
  const requestFocus = useFocusAfterRender();
  const prefix = useContext(IdPrefix);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const options = addTypeOptions(draft, query);
  const listed = typed ? listedTypes(draft, query) : [];
  const flat = ADD_TYPE_GROUPS.flatMap(({ list }) => options[list].map((type) => ({ type, list })));
  useEffect(() => {
    document.getElementById(`${prefix}add-type-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, prefix]);

  function close(focusLink = true) {
    setOpen(false);
    setQuery("");
    setActive(0);
    if (focusLink) requestFocus(addTypeLinkId(prefix));
  }

  function add(index: number) {
    const option = flat[index];
    if (!option) return;
    onAdd(option.type, option.list);
    close(option.list === "flags" && !typed);
  }

  function keyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActive((active + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      add(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  if (!open) {
    return (
      <button
        id={addTypeLinkId(prefix)}
        type="button"
        onClick={() => {
          setOpen(true);
          requestFocus(`${prefix}add-type-search`);
        }}
        className={`flex items-center gap-2 self-start px-3 text-small ${LINK_BUTTON}`}
      >
        <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M7 2v10M2 7h10" />
        </svg>
        {typed ? "Add a question type" : "Add a type the screenshot missed"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          id={`${prefix}add-type-search`}
          role="combobox"
          aria-label="Search question types"
          aria-expanded
          aria-controls={`${prefix}add-type-options`}
          aria-autocomplete="list"
          aria-activedescendant={flat[active] ? `${prefix}add-type-option-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={keyDown}
          className="h-9 min-w-0 grow rounded-sm border-2 border-accent bg-paper px-3 text-small text-ink outline-none"
        />
        <button type="button" onClick={() => close()} className={`h-9 px-3 text-small ${LINK_BUTTON}`}>
          Cancel
        </button>
      </div>
      <div className="flex flex-col rounded-sm border border-vellum-line bg-paper">
        <div id={`${prefix}add-type-options`} role="listbox" aria-label="Question types" className="flex max-h-72 flex-col overflow-y-auto py-1.5">
          {ADD_TYPE_GROUPS.map(({ list, label, typedLabel, none }, groupIndex) => (
            <div
              key={list}
              role="group"
              aria-labelledby={`${prefix}add-type-group-${list}`}
              className={groupIndex > 0 ? "mt-1 border-t border-vellum-line pt-1" : undefined}
            >
              <div id={`${prefix}add-type-group-${list}`} role="presentation" className="px-3 py-1.5 text-caption text-smoke">
                {typed ? typedLabel : label}
              </div>
              {options[list].length === 0 && <div className="flex h-9 items-center px-3 text-small text-smoke">{`${none} "${query.trim()}"`}</div>}
              {options[list].map((type) => {
                const optionIndex = flat.findIndex((option) => option.type === type);
                const selected = optionIndex === active;
                return (
                  <div
                    key={type}
                    id={`${prefix}add-type-option-${optionIndex}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(optionIndex)}
                    onClick={() => add(optionIndex)}
                    className={`flex min-h-9 cursor-pointer items-center justify-between px-3 text-small text-ink ${selected ? "bg-vellum" : ""}`}
                  >
                    {type}
                    {selected && <span className="font-mono text-caption text-smoke">Enter</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div role="status" className={listed.length > 0 ? "flex flex-col border-t border-vellum-line px-3 pt-2 pb-2.5 text-caption text-smoke" : "sr-only"}>
          {listed.map((type) => <span key={type}>{type} is already on your list.</span>)}
        </div>
      </div>
    </div>
  );
}

function ScreenshotToggle({ section, file }: { section: AnalyticsSection; file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const shown = useRef<string | null>(null);
  useEffect(() => () => {
    if (shown.current) URL.revokeObjectURL(shown.current);
  }, []);

  function toggle() {
    if (shown.current) URL.revokeObjectURL(shown.current);
    shown.current = url ? null : URL.createObjectURL(file);
    setUrl(shown.current);
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <button
        type="button"
        aria-expanded={url !== null}
        onClick={toggle}
        className={`flex items-center gap-3 rounded-sm border border-vellum-line bg-paper p-3 text-left ${FOCUS}`}
      >
        <span aria-hidden className="flex h-9 w-11 shrink-0 flex-col justify-center gap-1 rounded bg-vellum px-2">
          <span className="h-0.5 w-6 bg-fog" />
          <span className="h-0.5 w-5 bg-fog" />
          <span className="h-0.5 w-6 bg-fog" />
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-small font-medium text-ink">{`${url ? "Hide" : "Show"} your ${section} screenshot`}</span>
          <span className="truncate font-mono text-caption text-smoke">{file.name}</span>
        </span>
        <svg aria-hidden viewBox="0 0 16 16" className={`size-4 shrink-0 transition-transform duration-150 ${url ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it
        <img src={url} alt={`Your 7Sage ${SECTION_NAME[section]} screenshot`} className="w-full rounded-sm border border-vellum-line" />
      )}
    </div>
  );
}

export function ScreenshotCard({ section, file }: { section: AnalyticsSection; file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-small font-semibold text-ink">{SECTION_NAME[section]}</span>
        <span className="truncate font-mono text-caption text-smoke">{file.name}</span>
      </figcaption>
      <div className="rounded-sm border border-vellum-line bg-paper p-2 shadow-e1">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image cannot load it */}
        <img ref={image} alt={`Your 7Sage ${SECTION_NAME[section]} screenshot`} className="max-h-[440px] w-full rounded object-contain object-top" />
      </div>
    </figure>
  );
}
