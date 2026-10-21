import Link from "next/link";
import { FOCUS, cx } from "./classes";

export function ReminderStrip({ message, href, action }: { message: string; href: string; action: string }) {
  return (
    <aside
      aria-label="Reminder"
      className="flex flex-col items-start gap-1.5 border-b border-vellum-line bg-vellum px-5 py-3.5 text-small text-ink md:h-12 md:flex-row md:items-center md:justify-center md:gap-3 md:px-18 md:py-0 md:text-body"
    >
      <p>{message}</p>
      <Link href={href} className={cx("shrink-0 border-b border-ink font-medium text-ink", FOCUS)}>
        {action}
      </Link>
    </aside>
  );
}
