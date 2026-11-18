"use client";

import { useAdminTest } from "@/components/AdminTestContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { mondayOf, type WalkthroughFacts } from "@/lib/walkthrough";
import { AvatarMenu, PRESS, PrimaryTabs, StudentTabBar, TAB_BAR, tabBarItem, type StudentNavProps } from "./StudentNav";
import { NavIcon, type NavIconName } from "./NavIcon";
import { NavTab } from "@/components/ui/NavTab";
import { FOCUS, cx } from "@/components/ui/classes";
import { Walkthrough } from "./Walkthrough";
import { DESKTOP_BAR, HEADER, Logo, MOBILE_BAR, TABS, isTabActive } from "./shared";

const ADMIN_HOME = "/admin";
const STUDENT_HOME = "/dashboard";
const STUDENT_SIDE = [...TABS.map(({ href }) => href), "/onboarding", "/account"];

const ADMIN_TABS: { href: string; label: string; short: string; icon: NavIconName }[] = [
  { href: ADMIN_HOME, label: "Students", short: "Students", icon: "students" },
  { href: "/admin/lab", label: "Schedule lab", short: "Lab", icon: "lab" },
];

const currentAdminTab = (pathname: string) =>
  pathname === "/admin/lab" ? "/admin/lab" : pathname === ADMIN_HOME || /^\/admin\/students\/[^/]+$/.test(pathname) ? ADMIN_HOME : undefined;

const LAST_ADMIN_PAGE = "drillmap:last-admin-page";
function rememberAdminPage() {
  if (!currentAdminTab(location.pathname)) return;
  try {
    sessionStorage.setItem(LAST_ADMIN_PAGE, location.pathname + location.search);
  } catch {}
}
function lastAdminPage() {
  try {
    return sessionStorage.getItem(LAST_ADMIN_PAGE) ?? ADMIN_HOME;
  } catch {
    return ADMIN_HOME;
  }
}
const noChanges = () => () => {};

function SideSwitch({ pathname, studentSide, date }: { pathname: string; studentSide: boolean; date?: ReactNode }) {
  const adminHref = useSyncExternalStore(noChanges, lastAdminPage, () => ADMIN_HOME);
  const [picked, setPicked] = useState<{ studentSide: boolean; on: string } | null>(null);
  const pillOnStudent = picked?.on === pathname ? picked.studentSide : studentSide;
  const segment = cx("relative flex h-8 items-center justify-center rounded-pill px-3 whitespace-nowrap lg:px-4", FOCUS);
  const current = cx(segment, "font-medium text-ink");
  const other = cx(segment, "text-smoke pointer-hover:hover:text-ink active:scale-[0.97]", PRESS);
  return (
    <div role="group" aria-label="Side" className="relative grid shrink-0 grid-cols-2 rounded-pill bg-vellum p-1 text-small">
      <span
        aria-hidden
        className={cx(
          "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-pill bg-paper shadow-control transition-transform duration-(--duration-base) ease-(--ease-in-out-strong) motion-reduce:transition-none",
          pillOnStudent && "translate-x-full",
        )}
      />
      {studentSide ? (
        <Link href={adminHref} onClick={() => setPicked({ studentSide: false, on: pathname })} className={other}>Admin</Link>
      ) : (
        <span aria-current="true" className={current}>Admin</span>
      )}
      {studentSide ? (
        date ?? <span aria-current="true" aria-label="Student side" className={current}><StudentLabel /></span>
      ) : (
        <Link
          href={STUDENT_HOME}
          aria-label="Student side"
          onClick={() => {
            rememberAdminPage();
            setPicked({ studentSide: true, on: pathname });
          }}
          className={other}
        >
          <StudentLabel />
        </Link>
      )}
    </div>
  );
}

const StudentLabel = () => <><span className="min-[1280px]:hidden">Student</span><span className="hidden min-[1280px]:inline">Student side</span></>;

function AdminTabs({ pathname }: { pathname: string }) {
  const current = currentAdminTab(pathname);
  return (
    <nav data-page-fade aria-label="Admin" className="flex gap-1">
      {ADMIN_TABS.map((tab) => <NavTab key={tab.href} href={tab.href} current={tab.href === current}>{tab.label}</NavTab>)}
    </nav>
  );
}

function AdminTabBar({ pathname }: { pathname: string }) {
  const current = currentAdminTab(pathname);
  return (
    <nav aria-label="Admin" data-tab-bar data-page-fade className={cx(TAB_BAR, "grid-cols-2")}>
      {ADMIN_TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? "page" : undefined} className={tabBarItem(tab.href === current)}>
          <span className="flex h-6 w-12 items-center justify-center"><NavIcon name={tab.icon} /></span>
          {tab.short}
        </Link>
      ))}
    </nav>
  );
}

export default function AdminNav(props: StudentNavProps & { walkthrough?: WalkthroughFacts }) {
  const pathname = usePathname();
  const { currentWeek } = useAdminTest();
  const { walkthrough } = props;
  const uploadNeeded = walkthrough && currentWeek?.week === mondayOf(walkthrough.today)
    ? props.uploadNeeded && !currentWeek.exists
    : props.uploadNeeded;
  const studentSide = STUDENT_SIDE.some((href) => isTabActive(pathname, href));
  const studentTabs = studentSide && !isTabActive(pathname, "/onboarding");
  const home = studentSide ? STUDENT_HOME : ADMIN_HOME;
  const sideSwitch = studentSide && walkthrough
    ? <Walkthrough facts={walkthrough}>{(date) => <SideSwitch pathname={pathname} studentSide date={date} />}</Walkthrough>
    : <SideSwitch pathname={pathname} studentSide={studentSide} />;

  useEffect(rememberAdminPage, [pathname]);

  return (
    <>
      <header data-site-header="workspace" className={HEADER}>
        <div className={cx(MOBILE_BAR, "md:hidden")}>
          <Logo href={home} form="mark" />
          <div data-page-fade className="flex min-w-0 items-center gap-2">
            {sideSwitch}
            <AvatarMenu {...props} compact />
          </div>
        </div>
        <div className="hidden md:block">
          <div className={DESKTOP_BAR}>
            <div className="flex min-w-0 items-center gap-3 lg:gap-8">
              <Logo href={home} form="mark-below-lg" />
              {studentSide ? studentTabs && <PrimaryTabs uploadNeeded={uploadNeeded} /> : <AdminTabs pathname={pathname} />}
            </div>
            <div data-page-fade className="flex items-center gap-2 lg:gap-3">
              {sideSwitch}
              <AvatarMenu {...props} compact={false} />
            </div>
          </div>
        </div>
      </header>
      {studentSide ? studentTabs && <StudentTabBar uploadNeeded={uploadNeeded} /> : <AdminTabBar pathname={pathname} />}
    </>
  );
}
