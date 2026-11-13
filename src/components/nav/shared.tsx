import Link from "next/link";
import { FOCUS, PAGE_COLUMN, cx } from "@/components/ui/classes";
import { LOGO_ON_LIGHT, RouteLogo } from "@/components/ui/RouteLogo";
import type { NavIconName } from "./NavIcon";

export const UPLOAD_HREF = "/dashboard/upload";

export const TABS: { href: string; label: string; short: string; icon: NavIconName }[] = [
  { href: "/dashboard", label: "This week", short: "This week", icon: "week" },
  { href: UPLOAD_HREF, label: "Weekly upload", short: "Upload", icon: "upload" },
  { href: "/progress", label: "Progress", short: "Progress", icon: "progress" },
  { href: "/settings", label: "Study settings", short: "Settings", icon: "settings" },
];

export const isTabActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export const currentTabHref = (pathname: string) =>
  TABS.filter((tab) => isTabActive(pathname, tab.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

export const HEADER = "sticky top-0 z-40 border-b border-vellum-line bg-paper";
export const MOBILE_BAR = "flex h-14 items-center justify-between gap-3 px-5";
export const DESKTOP_BAR = `@container flex h-18 items-center justify-between gap-6 ${PAGE_COLUMN}`;
export const BAR = `${MOBILE_BAR} md:h-18 md:px-18`;

export function Logo({ href, form = "full" }: { href: string; form?: "full" | "mark" | "mark-below-md" }) {
  return (
    <Link href={href} data-page-logo className={cx("flex shrink-0 items-center rounded-xs", LOGO_ON_LIGHT, FOCUS)}>
      <span className="sr-only">DrillMap</span>
      {form !== "full" && <RouteLogo form="mark" className={form === "mark-below-md" ? "md:hidden" : undefined} />}
      {form !== "mark" && <RouteLogo form="full" className={form === "mark-below-md" ? "hidden md:block" : undefined} />}
    </Link>
  );
}
