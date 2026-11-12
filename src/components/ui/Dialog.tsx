"use client";

import { createContext, useContext, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { afterExit } from "./afterExit";
import { IconButton } from "./Button";
import { cx } from "./classes";

const CloseContext = createContext<() => void>(() => {});

type DialogProps = {
  open: boolean;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  children: ReactNode;
  className?: string;
} & ({ "aria-label": string } | { "aria-labelledby": string });

/**
 * A modal on the native `<dialog>`. The caller owns `open`; Escape, a click on the dimmed page and
 * `DialogClose` ask to close through `onClose`. Setting `open` to false plays the close motion, then
 * closes the dialog and focuses `returnFocusTo`, or else the control that had focus when it opened.
 * Pass `returnFocusTo` from a click handler: Safari and Firefox on macOS do not focus a clicked button.
 * While open the page cannot scroll; a page that had a scrollbar keeps its width, so nothing behind moves.
 */
export function Dialog({ open, onClose, returnFocusTo, onKeyDown, children, className, ...label }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pressStartedOutside = useRef(false);
  const isOpen = useRef(open);

  useEffect(() => {
    isOpen.current = open;
    const element = dialog.current;
    if (!element) return;
    if (open) {
      element.removeAttribute("data-closing");
      if (!element.open) {
        opener.current = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        const page = document.documentElement;
        page.toggleAttribute("data-page-scrollbar", window.innerWidth > page.clientWidth);
        element.showModal();
      }
      return;
    }
    if (!element.open) return;
    element.setAttribute("data-closing", "");
    let cancelled = false;
    void afterExit(element).then(() => {
      if (cancelled) return;
      element.removeAttribute("data-closing");
      element.close();
      opener.current?.focus();
      opener.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [open, returnFocusTo]);

  return (
    <dialog
      ref={dialog}
      {...label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return onKeyDown?.(event);
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (isOpen.current) onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOutside.current) onClose();
      }}
      className="ui-dialog fixed inset-0 m-0 h-dvh w-full max-h-none max-w-none overflow-hidden overscroll-contain bg-transparent"
    >
      <div className="pointer-events-none flex h-full items-center justify-center">
        <div className={cx("ui-dialog-panel pointer-events-auto max-h-full max-w-full overflow-auto rounded-lg bg-paper shadow-e3", className)}>
          <CloseContext.Provider value={onClose}>{children}</CloseContext.Provider>
        </div>
      </div>
    </dialog>
  );
}

export function DialogClose({ label = "Close", className }: { label?: string; className?: string }) {
  const close = useContext(CloseContext);
  return (
    <IconButton label={label} onClick={close} className={className}>
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M2 2l10 10M12 2L2 12" />
      </svg>
    </IconButton>
  );
}
