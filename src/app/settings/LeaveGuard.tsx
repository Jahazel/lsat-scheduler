"use client";

import { useEffect, useId, useRef } from "react";
import { afterExit } from "@/components/ui/afterExit";
import { cx } from "@/components/ui/classes";
import { addLeaveGuard } from "@/lib/leavePage";

const DIALOG_FOCUS = "focus:outline-2 focus:outline-offset-2 focus:outline-ink";

export function LeaveGuard({ dirty, waitForSave }: { dirty: boolean; waitForSave: () => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const pressed = useRef<HTMLElement | null>(null);
  const answer = useRef<(leave: boolean) => void>(() => {});
  const leaving = useRef(false);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!leaving.current) event.preventDefault();
    };
    const removeGuard = addLeaveGuard({
      confirm: (control) => new Promise((resolve) => {
        pressed.current = control;
        answer.current = resolve;
        dialog.current?.showModal();
        stayButton.current?.focus();
      }),
      ended: () => {
        leaving.current = false;
      },
    });
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      removeGuard();
    };
  }, [dirty]);

  function stay() {
    dialog.current?.close();
    const control = pressed.current;
    const menuButton = control?.closest('[role="menu"]')?.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    (menuButton ?? control)?.focus();
    answer.current(false);
  }

  async function leave() {
    const closing = dialog.current;
    if (!closing) return;
    closing.close();
    const [saved] = await Promise.all([waitForSave(), afterExit(closing)]);
    leaving.current = saved;
    answer.current(saved);
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
