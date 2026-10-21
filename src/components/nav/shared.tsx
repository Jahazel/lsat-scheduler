import Link from "next/link";
import { FOCUS, cx } from "@/components/ui/classes";
import type { NavIconName } from "./NavIcon";

export const TABS: { href: string; label: string; short: string; icon: NavIconName; flagsUpload?: true }[] = [
  { href: "/dashboard", label: "This week", short: "This week", icon: "week", flagsUpload: true },
  { href: "/progress", label: "Progress", short: "Progress", icon: "progress" },
  { href: "/settings", label: "Study settings", short: "Settings", icon: "settings" },
];

export const isTabActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export const HEADER = "sticky top-0 z-40 border-b border-vellum-line bg-paper";
export const MOBILE_BAR = "flex h-14 items-center justify-between gap-3 px-5";
export const DESKTOP_BAR = "flex h-18 items-center justify-between gap-6 px-18";
export const BAR = `${MOBILE_BAR} md:h-18 md:px-18`;

export function Logo({ href, compact = false }: { href: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "shrink-0 rounded-xs font-semibold text-ink",
        compact ? "text-h5" : "text-lead leading-h6 tracking-heading",
        FOCUS,
      )}
    >
      DrillMap
    </Link>
  );
}
