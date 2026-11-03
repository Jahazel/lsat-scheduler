import Link from "next/link";
import { FOCUS, cx } from "@/components/ui/classes";

export const FREE_WEEK_NOTE = "Your first full week free. No card needed.";

export function StartFreeWeekLink({ className }: { className?: string }) {
  return (
    <Link
      href="/signup"
      className={cx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm bg-ink text-body leading-[20px] font-medium text-chalk",
        "[transition:background-color_var(--duration-fast)_ease,scale_var(--duration-fast)_var(--ease-out-strong)] active:scale-[0.97]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-graphite-raised",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        FOCUS,
        className,
      )}
    >
      Start free week
    </Link>
  );
}
