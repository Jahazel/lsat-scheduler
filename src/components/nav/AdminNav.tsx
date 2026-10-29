"use client";

import { useAdminTest } from "@/components/AdminTestContext";
import AdminTestPanel, { AdminTestOpener } from "@/components/AdminTestPanel";
import type { TestControlState } from "@/components/TestControls";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import StudentNav, { StudentTabBar, type StudentNavProps } from "./StudentNav";
import { NavIcon } from "./NavIcon";
import { SignOutForm } from "@/components/SignOutForm";
import { Button } from "@/components/ui/Button";
import { FOCUS, cx } from "@/components/ui/classes";
import { BAR, HEADER, Logo, TABS, isTabActive } from "./shared";

function WorkspaceSwitcher({ studentSide, adminSide }: { studentSide: boolean; adminSide: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        // Safari mouse clicks may blur without focusing the destination link.
        // Outside pointer presses are handled separately.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cx("flex min-h-11 items-center gap-1 rounded-sm px-2 text-small font-medium text-ink hover:bg-vellum", FOCUS)}
      >
        {studentSide ? "My student side" : "All students"}
        <NavIcon name="chevron" className="size-4 text-smoke" />
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label="Workspace"
          className="absolute -left-20 top-full z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xs border border-vellum-line bg-paper py-1 shadow-e3 sm:left-0"
        >
          {[
            { href: "/admin", label: "All students", detail: "Real students on the real date", active: adminSide },
            { href: "/dashboard", label: "My student side", detail: "Your test profile with date controls", active: studentSide },
          ].map((option) => (
            <Link
              key={option.href}
              href={option.href}
              aria-current={option.active ? "true" : undefined}
              onClick={() => setOpen(false)}
              className={cx("flex items-center justify-between gap-3 px-4 py-3 text-small text-ink hover:bg-vellum", option.active && "bg-vellum font-semibold", FOCUS)}
            >
              <span>
                <span className={cx("block font-medium", option.active && "font-semibold")}>{option.label}</span>
                <span className="block text-caption font-regular text-smoke">{option.detail}</span>
              </span>
              {option.active && <NavIcon name="check" className="size-4 text-ink" />}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function AdminNav(props: StudentNavProps & { testState?: TestControlState }) {
  const pathname = usePathname();
  const { currentWeek } = useAdminTest();
  const uploadNeeded = currentWeek?.week === props.testState?.weekStartDate
    ? props.uploadNeeded && !currentWeek?.exists
    : props.uploadNeeded;
  const studentSide = [...TABS.map(({ href }) => href), "/onboarding", "/account"]
    .some((href) => isTabActive(pathname, href));
  const adminSide = isTabActive(pathname, "/admin");
  const switcher = <WorkspaceSwitcher key={pathname} studentSide={studentSide} adminSide={adminSide} />;
  const testPanelId = useId();
  const testState = studentSide ? props.testState : undefined;

  return (
    <>
      <header className={HEADER}>
        {studentSide ? (
          <StudentNav {...props} uploadNeeded={uploadNeeded} workspaceSwitcher={switcher} />
        ) : (
          <div className={BAR}>
            <div className="flex items-center gap-1 sm:gap-3">
              <Logo href="/admin" />
              <span className="text-fog" aria-hidden data-workspace-separator="true">/</span>
              {switcher}
            </div>
            <SignOutForm action={props.logOut}>
              <Button type="submit" variant="text" size="md">Log out</Button>
            </SignOutForm>
          </div>
        )}
        {testState && <AdminTestOpener state={testState} panelId={testPanelId} />}
      </header>
      {testState && <AdminTestPanel state={testState} panelId={testPanelId} />}
      {studentSide && <StudentTabBar uploadNeeded={uploadNeeded} withWorkspaceSwitcher />}
    </>
  );
}
