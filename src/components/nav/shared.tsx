import Link from "next/link";
import type { NavIconName } from "./NavIcon";

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For controls inside a box that clips overflow: the ring is drawn inside the control.
export const FOCUS_INSET = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export const TABS: { href: string; label: string; short: string; icon: NavIconName; flagsUpload?: true }[] = [
  { href: "/dashboard", label: "This week", short: "This week", icon: "week", flagsUpload: true },
  { href: "/progress", label: "Progress", short: "Progress", icon: "progress" },
  { href: "/settings", label: "Study settings", short: "Settings", icon: "settings" },
];

export const isTabActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className={cx("font-semibold tracking-tight text-ink", FOCUS)}>
      DrillMap
    </Link>
  );
}
