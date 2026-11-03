"use client";

import { useEffect, useId, useRef } from "react";
import { afterExit } from "@/components/ui/afterExit";
import { cx } from "@/components/ui/classes";

const DIALOG_FOCUS = "focus:outline-2 focus:outline-offset-2 focus:outline-ink";

function leavingLink(target: EventTarget | null) {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const to = new URL(link.href);
  const leaves = to.origin === location.origin && (to.pathname !== location.pathname || to.search !== location.search);
  return leaves ? link : null;
}

export function LeaveGuard({ dirty, waitForSave }: { dirty: boolean; waitForSave: () => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const pressedLink = useRef<HTMLAnchorElement | null>(null);
  const passing = useRef(false);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      if (passing.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = leavingLink(event.target);
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      pressedLink.current = link;
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
    const link = pressedLink.current;
    const menuButton = link?.closest('[role="menu"]')?.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    (menuButton ?? link)?.focus();
  }

  async function leave() {
    const closing = dialog.current;
    const link = pressedLink.current;
    if (!closing || !link) return;
    closing.close();
    const [saved] = await Promise.all([waitForSave(), afterExit(closing)]);
    if (!saved) return;
    passing.current = true;
    link.click();
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
