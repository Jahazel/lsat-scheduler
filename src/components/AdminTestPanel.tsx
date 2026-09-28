"use client";

import { useEffect, useRef, useState } from "react";
import TestControls, {
  displaySimulatedDate,
  type TestControlState,
} from "./TestControls";
import { FOCUS, cx } from "./nav/shared";

export default function AdminTestPanel({ state }: { state: TestControlState }) {
  const [expanded, setExpanded] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const label = state.simulated ? "Simulated" : "Real date";
  return (
    <>
      <div className="border-t border-ink-100 px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          aria-haspopup="dialog"
          className={cx(
            "min-h-11 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900 hover:bg-ink-50",
            FOCUS,
          )}
        >
          {label} · {displaySimulatedDate(state.date)}
          <span className="sr-only"> · Open test controls</span>
        </button>
      </div>
      <aside
        aria-label="Test controls"
        data-test-dock={expanded ? "expanded" : "collapsed"}
        className={cx(
          "fixed bottom-0 right-0 top-16 hidden overflow-y-auto border-l border-ink-200 bg-white lg:block",
          expanded ? "w-80" : "w-20",
        )}
      >
        {expanded ? (
          <TestControls state={state} onClose={() => setExpanded(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cx(
              "flex min-h-44 w-full flex-col items-center gap-4 px-2 py-5 text-xs text-ink-700 hover:bg-ink-50",
              FOCUS,
            )}
            aria-label="Expand test controls"
          >
            <span className="font-semibold">{label}</span>
            <time
              dateTime={state.date}
              className="[writing-mode:vertical-rl] tabular-nums"
            >
              {displaySimulatedDate(state.date)}
            </time>
            <span>Expand</span>
          </button>
        )}
      </aside>
      <dialog
        ref={dialog}
        aria-label="Test controls"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-80 max-w-full overflow-y-auto bg-white p-0 backdrop:bg-ink-900/30 lg:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <TestControls state={state} onClose={() => dialog.current?.close()} />
      </dialog>
    </>
  );
}
