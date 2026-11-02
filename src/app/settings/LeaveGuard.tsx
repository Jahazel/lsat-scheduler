"use client";

import { useEffect, useId, useRef } from "react";
import { cx } from "@/components/ui/classes";

const NAV_TAB = 'nav[aria-label="Primary"] a[href]:not([aria-current="page"])';
const DIALOG_FOCUS = "focus:outline-2 focus:outline-offset-2 focus:outline-ink";

export function LeaveGuard({ dirty }: { dirty: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const pressedTab = useRef<HTMLAnchorElement | null>(null);
  const passing = useRef(false);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      if (passing.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const tab = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(NAV_TAB) : null;
      if (!tab) return;
      event.preventDefault();
      event.stopPropagation();
      pressedTab.current = tab;
      dialog.current?.showModal();
      stayButton.current?.focus();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function stay() {
    dialog.current?.close();
    pressedTab.current?.focus();
  }

  async function leave() {
    const closing = dialog.current;
    const tab = pressedTab.current;
    if (!closing || !tab) return;
    closing.close();
    await Promise.allSettled(closing.getAnimations().map((exit) => exit.finished));
    passing.current = true;
    tab.click();
    passing.current = false;
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        stay();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        stay();
      }}
      className="leave-dialog m-auto w-[calc(100%-32px)] max-w-[400px] rounded-md bg-paper p-6 shadow-e3"
    >
      <div className="flex flex-col gap-2">
        <h2 id={titleId} className="text-[18px] leading-6 font-semibold text-ink">
          Leave without saving?
        </h2>
        <p id={bodyId} className="text-[14px] leading-5 text-smoke">
          Your changes to Study settings will be lost.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={leave}
            className={cx("h-10 rounded-sm border border-danger-ink px-[18px] text-small font-medium text-danger-ink", DIALOG_FOCUS)}
          >
            Leave
          </button>
          <button ref={stayButton} type="button" onClick={stay} className={cx("h-10 rounded-sm bg-ink px-[18px] text-small font-medium text-paper", DIALOG_FOCUS)}>
            Stay
          </button>
        </div>
      </div>
    </dialog>
  );
}
