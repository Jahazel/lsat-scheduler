"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FOCUS, MOTION, cx } from "@/components/ui/classes";
import { isUnexpectedFailure, UNEXPECTED_FAILURE_MESSAGE, type FailureCode, type FormState } from "@/lib/unexpectedFailure";

type Toast = { code: FailureCode; notice: string; action: string; replaced: boolean };
type Toasts = { shown: Toast | null; leaving: Toast | null };

const NO_TOASTS: Toasts = { shown: null, leaving: null };
const LEAVE_MS = 200;

const close = (toasts: Toasts): Toasts => (toasts.shown ? { shown: null, leaving: toasts.shown } : toasts);

function answered(toasts: Toasts, notice: string, action: string, answer: unknown): Toasts {
  if (!isUnexpectedFailure(answer)) return toasts.shown?.notice === notice && toasts.shown.action === action ? close(toasts) : toasts;
  if (toasts.shown?.code === answer.unexpectedFailure) return toasts;
  return { shown: { code: answer.unexpectedFailure, notice, action, replaced: toasts.shown !== null }, leaving: null };
}

type Report = (notice: string, action: string, answer: unknown) => void;
const ReportContext = createContext<Report>(() => {});

export function FailureToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState(NO_TOASTS);
  const pathname = usePathname();
  const [toastsPathname, setToastsPathname] = useState(pathname);
  if (pathname !== toastsPathname) {
    setToastsPathname(pathname);
    setToasts(close);
  }
  const report = useCallback<Report>((notice, action, answer) => setToasts((current) => answered(current, notice, action, answer)), []);
  const leftAt = useCallback((code: FailureCode) => setToasts((current) =>
    current.leaving?.code === code ? { ...current, leaving: null } : current), []);

  return (
    <ReportContext value={report}>
      {children}
      <ToastSlot>
        {[toasts.leaving, toasts.shown].map((toast) => toast && (toast === toasts.shown
          ? <ToastCard key={toast.code} toast={toast} onClose={() => setToasts(close)} />
          : <ToastCard key={toast.code} toast={toast} onLeft={leftAt} />))}
      </ToastSlot>
    </ReportContext>
  );
}

/**
 * Lifts the toast above the on-screen keyboard, which covers fixed elements on phones without resizing the page.
 * While a dialog is open, the slot moves into it: a modal dialog makes the rest of the page inert and covers it.
 */
function ToastSlot({ children }: { children: ReactNode }) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    const find = () => setDialog([...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1) ?? null);
    const observer = new MutationObserver(find);
    observer.observe(document.body, { subtree: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const measure = () => setKeyboardInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, []);
  const slot = (
    <div
      className="failure-toast-slot pointer-events-none fixed inset-x-0 z-50 grid justify-items-center px-3 *:col-start-1 *:row-start-1"
      style={keyboardInset > 0 ? { bottom: keyboardInset + 12 } : undefined}
    >
      {children}
    </div>
  );
  return dialog ? createPortal(slot, dialog) : slot;
}

function ToastCard({ toast, onClose, onLeft }: { toast: Toast; onClose?: () => void; onLeft?: (code: FailureCode) => void }) {
  const leaving = onLeft !== undefined;
  useEffect(() => {
    if (!onLeft) return;
    const timer = setTimeout(() => onLeft(toast.code), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [onLeft, toast.code]);

  return (
    <div
      role={leaving ? undefined : "alert"}
      aria-hidden={leaving || undefined}
      inert={leaving}
      data-leaving={leaving || undefined}
      data-replaced={toast.replaced || undefined}
      onTransitionEnd={(event) => {
        if (onLeft && event.target === event.currentTarget && event.propertyName === "opacity") onLeft(toast.code);
      }}
      className="failure-toast pointer-events-auto flex w-full items-start gap-3 self-end rounded-md border border-vellum-line bg-paper py-4 pr-1 pl-4 shadow-e3 md:w-[360px]"
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="mt-px shrink-0 text-danger">
        <circle cx="10" cy="10" r="8.2" />
        <path d="M10 5.8v5M10 13.6v.4" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="mt-px mb-1 text-small leading-[20px] font-medium text-ink">{UNEXPECTED_FAILURE_MESSAGE}</p>
        <p className="text-caption leading-[16px] text-smoke">
          Error code <span className="ml-1 font-mono text-[13px] text-danger-ink select-all">{toast.code}</span>
        </p>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cx("-my-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill text-smoke hover:bg-vellum", MOTION, FOCUS)}
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Shows the failure toast when `answer` becomes an unexpected failure, and closes it
 * when the same `action` answers again without one. Renders nothing in place, so a
 * screen that swaps its form for a next step keeps the notice mounted outside both.
 */
export function FailureNotice({ answer, action = "" }: { answer: unknown; action?: string }) {
  const report = useContext(ReportContext);
  const notice = useId();
  const previous = useRef(answer);
  useEffect(() => {
    if (previous.current === answer) return;
    previous.current = answer;
    report(notice, action, answer);
  }, [action, answer, notice, report]);
  return null;
}

export function FailureNoticeOnArrival({ code }: { code: FailureCode }) {
  const report = useContext(ReportContext);
  const notice = useId();
  const shown = useRef<FailureCode | null>(null);
  useEffect(() => {
    if (shown.current === code) return;
    shown.current = code;
    report(notice, "", { unexpectedFailure: code });
  }, [code, notice, report]);
  return null;
}

export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & {
  action: () => Promise<FormState>;
}) {
  const [answer, formAction] = useActionState(action, null);
  return (
    <form action={formAction} {...props}>
      {children}
      <FailureNotice answer={answer} />
    </form>
  );
}
