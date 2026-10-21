"use client";

import { useEffect, useRef, useState } from "react";
import TestControls, {
  displaySimulatedDate,
  type TestControlState,
} from "./TestControls";
import { FOCUS, FOCUS_INSET, cx } from "./nav/shared";

function panelLabel(state: TestControlState) {
  return state.simulated ? "Simulated" : "Real date";
}

// The opener sits in the page header on small screens. The slide-over it opens
// is rendered by AdminTestPanel, outside the header.
export function AdminTestOpener({ state, panelId }: { state: TestControlState; panelId: string }) {
  return (
    <div className="border-t border-vellum-line px-4 py-2 lg:hidden">
      <button
        type="button"
        onClick={() => (document.getElementById(panelId) as HTMLDialogElement | null)?.showModal()}
        aria-haspopup="dialog"
        aria-controls={panelId}
        className={cx(
          "min-h-11 rounded-sm border border-vellum-line px-3 py-2 text-small text-ink hover:bg-vellum",
          FOCUS,
        )}
      >
        {panelLabel(state)} · {displaySimulatedDate(state.date)}
        <span className="sr-only"> · Open test controls</span>
      </button>
    </div>
  );
}

export default function AdminTestPanel({ state, panelId }: { state: TestControlState; panelId: string }) {
  const [expanded, setExpanded] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  // Toggling swaps the focused button for its opposite, so focus follows it.
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    toggled.current = false;
    (expanded ? closeButton : expandButton).current?.focus();
  }, [expanded]);
  function toggle(next: boolean) {
    toggled.current = true;
    setExpanded(next);
  }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const label = panelLabel(state);
  return (
    <>
      <aside
        aria-label="Test controls"
        data-test-dock={expanded ? "expanded" : "collapsed"}
        className={cx(
          "fixed bottom-0 right-0 top-16 z-30 hidden overflow-y-auto border-l border-vellum-line bg-paper lg:block",
          expanded ? "w-80" : "w-20",
        )}
      >
        {expanded ? (
          <TestControls
            state={state}
            onClose={() => toggle(false)}
            closeRef={closeButton}
            closeExpanded
          />
        ) : (
          <button
            ref={expandButton}
            type="button"
            onClick={() => toggle(true)}
            aria-expanded={false}
            className={cx(
              "flex min-h-44 w-full flex-col items-center gap-4 px-2 py-5 text-caption text-smoke hover:bg-vellum",
              FOCUS_INSET,
            )}
          >
            <span className="font-semibold">{label}</span>{" "}
            <time
              dateTime={state.date}
              className="[writing-mode:vertical-rl] tabular-nums"
            >
              {displaySimulatedDate(state.date)}
            </time>{" "}
            <span>
              Expand{" "}<span className="sr-only">test controls</span>
            </span>
          </button>
        )}
      </aside>
      <dialog
        ref={dialog}
        id={panelId}
        aria-label="Test controls"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-80 max-w-full overflow-y-auto bg-paper p-0 backdrop:bg-ink/30 lg:hidden"
        onClick={(event) => {
          // Only backdrop clicks reach the dialog itself; the inner box covers the panel.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="min-h-full">
          <TestControls state={state} onClose={() => dialog.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
