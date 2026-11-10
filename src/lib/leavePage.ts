import { isPlainClick } from "@/lib/motion";

export type LeaveResult = "left" | "stayed" | "failed";

export type LeaveGuard = {
  /** Resolves true when the student chooses to leave. */
  confirm: (control: HTMLElement) => Promise<boolean>;
  ended: (result: LeaveResult) => void;
};

const guards = new Set<LeaveGuard>();

export function addLeaveGuard(guard: LeaveGuard) {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}

export const leaveIsGuarded = () => guards.size > 0;

/** The same-tab link this click follows to another page, or null. */
export function leavingLink(event: MouseEvent): HTMLAnchorElement | null {
  if (!isPlainClick(event) || !(event.target instanceof Element)) return null;
  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const to = new URL(link.href);
  const leaves = to.origin === location.origin && (to.pathname !== location.pathname || to.search !== location.search);
  return leaves ? link : null;
}

export async function leavePage(control: HTMLElement, go: () => Promise<LeaveResult>): Promise<LeaveResult> {
  const asked = [...guards];
  let result: LeaveResult = "stayed";
  try {
    for (const guard of asked) if (!(await guard.confirm(control))) return result;
    result = "failed";
    result = await go();
    return result;
  } finally {
    for (const guard of asked) guard.ended(result);
  }
}
