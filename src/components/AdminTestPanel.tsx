"use client";

import { useRef } from "react";
import TestControls, { displaySimulatedDate, type TestControlState } from "./TestControls";
import { FOCUS, cx } from "./ui/classes";

export default function AdminTestPanel({ state }: { state: TestControlState }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        className={cx(
          "relative flex w-fit items-center rounded-pill border border-dashed border-vellum-line px-3 py-1 text-caption text-smoke before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-[''] pointer-hover:bg-paper",
          FOCUS,
        )}
      >
        {state.simulated ? "Admin date" : "Real date"}:&nbsp;
        <time dateTime={state.date} className="font-medium text-ink tabular-nums">{displaySimulatedDate(state.date)}</time>
        &nbsp;·&nbsp;<span className="font-medium text-accent">Change</span>
        <span className="sr-only"> · Open test controls</span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Test controls"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[calc(20rem+env(safe-area-inset-right))] max-w-full overflow-y-auto bg-paper p-0 backdrop:bg-ink/30"
        onClick={(event) => {
          // Only backdrop clicks reach the dialog itself; the inner box covers the panel.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="min-h-full pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
          <TestControls state={state} onClose={() => dialog.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
