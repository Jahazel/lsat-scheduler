import Link from "next/link";
import { FOCUS, cx } from "@/components/ui/classes";

export const FREE_WEEK_NOTE = "Your first full week free. Cancel before it ends and pay nothing.";

export function LinkArrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className="link-arrow">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StartFreeWeekLink({ className }: { className?: string }) {
  return (
    <Link
      href="/signup"
      className={cx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm bg-void-eclipse text-body leading-[20px] font-medium text-paper",
        "[transition:background-color_var(--duration-fast)_ease,scale_var(--duration-fast)_var(--ease-out-strong)] active:scale-[0.97]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-abyss-blue",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        FOCUS,
        className,
      )}
    >
      Start free week
    </Link>
  );
}
