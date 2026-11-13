import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS, cx } from "./classes";

export function NavTab({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cx(
        "flex h-10 items-center gap-2 whitespace-nowrap rounded-pill px-4 text-small",
        "transition-[color,background-color,scale] duration-(--duration-fast) ease-(--ease-out-strong) pointer-hover:bg-vellum pointer-hover:text-ink active:scale-[0.97] motion-reduce:active:scale-100",
        current ? "bg-vellum font-medium text-ink" : "text-smoke",
        FOCUS,
      )}
    >
      {children}
    </Link>
  );
}
