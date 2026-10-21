import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export function NavTab({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cx(
        "flex h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-body text-ink hover:bg-vellum",
        current ? "bg-vellum font-medium" : "font-regular",
        MOTION,
        FOCUS,
      )}
    >
      {children}
    </Link>
  );
}
