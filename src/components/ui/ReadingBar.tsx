import { useEffect, useState, type ReactNode } from "react";
import { reducedMotion } from "@/lib/motion";
import type { FileRead } from "@/lib/screenshotReadQueue";
import { cx } from "./classes";

type ReadStatus = FileRead<unknown>["status"];

type ReadingPhase = "off" | "reading" | "filling" | "filled" | "lost";

export interface ReadingBarState {
  phase: ReadingPhase;
  longRead: boolean;
}

const LONG_READ_MS = 10_000;
const RESULT_DELAY_MS = 260;

function nextPhase(status: ReadStatus, previous: ReadingPhase): ReadingPhase {
  switch (status) {
    case "reading": return "reading";
    case "connection-lost": return "lost";
    case "read": return previous === "reading" ? "filling" : previous === "filling" || previous === "filled" ? previous : "off";
    default: return "off";
  }
}

export function useReadingBar(status: ReadStatus): ReadingBarState {
  const [state, setState] = useState(() => ({ status, phase: nextPhase(status, "off"), longRead: false }));
  let current = state;
  if (state.status !== status) {
    const phase = nextPhase(status, state.phase);
    current = { status, phase, longRead: state.longRead && phase === "filling" };
    setState(current);
  }
  const { phase } = current;

  useEffect(() => {
    if (phase !== "reading" && phase !== "filling") return;
    const timer = phase === "reading"
      ? setTimeout(() => setState((now) => (now.phase === "reading" ? { ...now, longRead: true } : now)), LONG_READ_MS)
      : setTimeout(() => setState((now) => (now.phase === "filling" ? { ...now, phase: "filled" } : now)), reducedMotion() ? 0 : RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return { phase, longRead: current.longRead };
}

export function ReadingBar({ label, phase, longRead }: ReadingBarState & { label: string }) {
  const open = phase === "reading" || phase === "filling" || phase === "lost";
  const running = phase === "reading" || phase === "filling";
  return (
    <div className="reading-area" data-phase={phase} data-open={open ? "" : undefined} aria-hidden={open ? undefined : true}>
      <div className="flex flex-col gap-2.5">
        <div
          role={running ? "progressbar" : undefined}
          aria-label={running ? label : undefined}
          aria-hidden={running ? undefined : true}
          className={cx("relative mt-3 h-1 shrink-0 overflow-hidden rounded-sm bg-vellum", phase === "off" && "invisible")}
        >
          <div className="reading-fill absolute inset-0 rounded-sm bg-accent" />
          <div className="reading-segment absolute inset-y-0 left-0 rounded-sm bg-accent" />
        </div>
        {longRead && <p className="reading-note text-small text-smoke">Still reading. This can take up to 30 seconds.</p>}
      </div>
    </div>
  );
}

export function ReadDetail({ name, status, glyph, className }: { name: string; status?: string; glyph?: ReactNode; className?: string }) {
  const sentence = status?.endsWith(".") ?? false;
  return (
    <span aria-live="polite" className={cx("flex min-w-0 items-center gap-1.5", className)}>
      {glyph}
      <span className={cx("flex min-w-0", sentence && "flex-col")}>
        <span className="min-w-0 truncate">{name}</span>
        {status && (sentence
          ? <span><span className="sr-only"> · </span>{status}</span>
          : <span className="shrink-0 whitespace-pre">{` · ${status}`}</span>)}
      </span>
    </span>
  );
}
