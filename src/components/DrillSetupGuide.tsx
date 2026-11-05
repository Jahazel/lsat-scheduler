"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { difficultyText, SEVEN_SAGE_URL, type DrillSetupGuide as GuideContent, type FilterPass, type StepText } from "@/lib/drillSetupGuide";
import { durationMs, motionToken, reducedMotion } from "@/lib/motion";
import { Dialog } from "@/components/ui/Dialog";
import { FOCUS, cx } from "@/components/ui/classes";

const PRESS = cx(
  "touch-manipulation select-none [-webkit-tap-highlight-color:transparent] active:scale-97 motion-reduce:active:scale-100",
  "[transition:color_var(--duration-fast)_ease-out,background-color_var(--duration-fast)_ease-out,border-color_var(--duration-fast)_ease-out,scale_var(--duration-fast)_var(--ease-out-strong)]",
  FOCUS,
);
const OUTLINE = cx("inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xs border border-vellum-line bg-paper px-3.5 text-small font-medium text-ink pointer-hover:bg-vellum", PRESS);

type Move = { direction: 1 | -1; animate: boolean };

function Text({ text }: { text: StepText }) {
  return text.map((part, index) => typeof part === "string" ? part : <b key={index} className="font-medium text-ink">{part.value}</b>);
}

function OpenSevenSage() {
  return (
    <a href={SEVEN_SAGE_URL} target="_blank" rel="noopener noreferrer" aria-label="Open 7Sage drills (opens in a new tab)" className={cx(OUTLINE, "self-stretch")}>
      Open 7Sage drills
      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 2.5h5.5V8M9.5 2.5L3 9" />
      </svg>
    </a>
  );
}

function DifficultyDots({ difficulty: { low, high } }: Pick<FilterPass, "difficulty">) {
  return (
    <span className="mr-1.5 inline-flex gap-0.5 align-middle" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((level) => <i key={level} className={cx("size-[7px] rounded-[2px]", level >= low && level <= high ? "bg-ink" : "bg-vellum-line")} />)}
    </span>
  );
}

const STACKED_CELL = "@max-[300px]:flex @max-[300px]:gap-2 @max-[300px]:border-0 @max-[300px]:px-0 @max-[300px]:py-0.5 @max-[300px]:before:shrink-0 @max-[300px]:before:basis-[88px] @max-[300px]:before:text-caption @max-[300px]:before:text-smoke @max-[300px]:before:content-[attr(data-label)]";

function FiltersTable({ guide }: { guide: GuideContent }) {
  const tagsLabel = guide.guess.tags ? "Tags (guess)" : "Tags";
  const difficultyLabel = guide.guess.difficulty ? "Difficulty (guess)" : "Difficulty";
  return (
    <div className="@container mt-2 flex flex-col gap-3">
      <p className="text-caption text-smoke">Your filters on 7Sage</p>
      <p className="text-small text-ink">Section: <b className="font-medium">{guide.section}</b></p>
      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-md border border-vellum-line text-small leading-5 text-ink">
        <thead className="@max-[300px]:hidden">
          <tr className="bg-vellum text-left text-caption text-smoke">
            <th className="whitespace-nowrap px-3 py-2 font-regular">{tagsLabel}</th>
            <th className="whitespace-nowrap px-3 py-2 font-regular">{difficultyLabel}</th>
            <th className="whitespace-nowrap px-3 py-2 font-regular">Add</th>
          </tr>
        </thead>
        <tbody>
          {guide.passes.map((pass, index) => (
            <tr key={index} className="@max-[300px]:block @max-[300px]:border-t @max-[300px]:border-vellum-line @max-[300px]:px-3 @max-[300px]:py-2.5 @max-[300px]:first:border-t-0">
              <td data-label={tagsLabel} className={cx("border-t border-vellum-line px-3 py-2.5 align-top", STACKED_CELL)}><b className="font-medium">{pass.tags}</b></td>
              <td data-label={difficultyLabel} className={cx("whitespace-nowrap border-t border-vellum-line px-3 py-2.5 align-top tabular-nums", STACKED_CELL)}>
                <span><DifficultyDots difficulty={pass.difficulty} />{difficultyText(pass.difficulty)}</span>
              </td>
              <td data-label="Add" className={cx("whitespace-nowrap border-t border-vellum-line px-3 py-2.5 align-top tabular-nums", STACKED_CELL)}>
                {pass.add}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3} className="border-t border-vellum-line bg-vellum px-3 py-2.5 text-[13px] text-smoke">Total: <b className="font-medium text-ink">{guide.total}</b></td></tr>
        </tfoot>
      </table>
      <OpenSevenSage />
    </div>
  );
}

const ArrowRight = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

function slideIn(element: HTMLElement, { direction, animate }: Move, delay: number) {
  for (const running of element.getAnimations()) running.cancel();
  if (!animate) return;
  const x = reducedMotion() ? 0 : direction * 12;
  element.animate([{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: "none" }],
    { duration: durationMs("--duration-base"), delay, easing: motionToken("--ease-out-strong"), fill: "backwards" });
}

export function DrillSetupGuide({ open, onClose, returnFocusTo, day, label, guide }: {
  open: boolean;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
  day: string;
  label: string;
  guide: GuideContent;
}) {
  const titleId = useId();
  const title = useRef<HTMLParagraphElement>(null);
  const screenshot = useRef<HTMLDivElement>(null);
  const step = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [card, setCard] = useState(0);
  const [move, setMove] = useState<Move | null>(null);
  const last = guide.steps.length - 1;
  const current = guide.steps[card]!;

  useEffect(() => {
    if (open) title.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!move) return;
    slideIn(screenshot.current!, move, 0);
    slideIn(step.current!, move, 40);
  }, [card, move]);

  function go(to: number, animate = true) {
    if (to < 0 || to > last || to === card) return;
    if (to === 0 && document.activeElement === back.current) next.current?.focus();
    setMove({ direction: to > card ? 1 : -1, animate });
    setCard(to);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    go(card + (event.key === "ArrowRight" ? 1 : -1), !event.repeat);
  }

  return (
    <Dialog open={open} onClose={onClose} returnFocusTo={returnFocusTo} aria-labelledby={titleId} onKeyDown={onKeyDown}
      className="h-[680px] w-[1080px]">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-vellum-line py-3 pr-3 pl-5">
          <p id={titleId} ref={title} tabIndex={-1}
            className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-[18px] text-smoke focus:outline-none md:line-clamp-none">
            Drill setup guide · {day} · <b className="font-medium text-ink">{label}</b>
          </p>
          <button type="button" aria-label="Close the drill setup guide" onClick={onClose}
            className={cx("inline-flex size-10 shrink-0 items-center justify-center rounded-pill text-smoke pointer-hover:bg-vellum pointer-hover:text-ink md:size-8", PRESS)}>
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
          <div className="relative h-[max(140px,calc(100dvh-460px))] shrink-0 overflow-hidden bg-vellum md:h-auto">
            <div ref={screenshot} className="absolute inset-x-4 top-4 bottom-0 md:inset-6" />
          </div>
          <div className="flex flex-[1_0_auto] flex-col px-4 pt-4 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:border-l md:border-vellum-line md:p-6">
            <div ref={step} className="flex flex-col gap-2.5">
              <p className="text-caption tracking-[0.1em] text-smoke uppercase tabular-nums">Step {card + 1} of {guide.steps.length}</p>
              <h3 className="text-[20px] leading-7 font-medium tracking-[-0.01em] text-ink">{current.title}</h3>
              <p className="text-small leading-[22px] text-smoke"><Text text={current.text} /></p>
              {card === 3 ? <FiltersTable guide={guide} /> : <div className="mt-2 flex"><OpenSevenSage /></div>}
            </div>
            <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-2 border-t border-vellum-line bg-paper px-4 py-3 md:-mx-6 md:-mb-6 md:border-t-0 md:px-6 md:pt-4 md:pb-6">
              <div className="mr-auto flex items-center gap-1.5">
                {guide.steps.map((_, index) => (
                  <button key={index} type="button" aria-label={`Step ${index + 1}`} aria-current={index === card ? "step" : undefined}
                    onClick={() => go(index)}
                    className={cx("relative h-1.5 rounded-pill after:absolute after:-inset-x-1 after:-inset-y-[9px] after:content-['']",
                      "touch-manipulation [-webkit-tap-highlight-color:transparent]", FOCUS,
                      index === card ? "w-5 bg-ink" : "w-1.5 bg-vellum-line")} />
                ))}
              </div>
              <button ref={back} type="button" disabled={card === 0} onClick={() => go(card - 1)}
                className={cx(OUTLINE, "disabled:cursor-default disabled:opacity-muted")}>
                Back
              </button>
              <button ref={next} type="button" onClick={card === last ? onClose : () => go(card + 1)}
                className={cx("inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xs bg-accent px-[18px] text-small font-medium text-chalk",
                  "pointer-hover:bg-[color-mix(in_srgb,var(--color-accent)_80%,var(--color-ink))]", PRESS)}>
                {card === last ? "Done" : <>Next step <ArrowRight /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
