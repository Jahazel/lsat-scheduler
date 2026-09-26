"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import StudentNav, { StudentTabBar, type StudentNavProps } from "./StudentNav";
import { NavIcon } from "./NavIcon";
import { FOCUS, Logo, TABS, cx, isTabActive } from "./shared";

function WorkspaceSwitcher({ studentSide }: { studentSide: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
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
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cx("flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-ink-900 hover:bg-ink-50", FOCUS)}
      >
        {studentSide ? "My student side" : "All students"}
        <NavIcon name="chevron" className="size-4 text-ink-500" />
      </button>
      {open && (
        <nav
          id={menuId}
          aria-label="Workspace"
          className="absolute -left-20 top-full z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-ink-200 bg-white py-1 shadow-[0_8px_24px_oklch(19%_0.013_205/0.12)] sm:left-0"
        >
          {[
            { href: "/admin", label: "All students", detail: "Real students on the real date", active: !studentSide },
            { href: "/dashboard", label: "My student side", detail: "Your test profile on the real date", active: studentSide },
          ].map((option) => (
            <Link
              key={option.href}
              href={option.href}
              aria-current={option.active ? "true" : undefined}
              onClick={() => setOpen(false)}
              className={cx("block px-4 py-3 text-sm text-ink-900 hover:bg-ink-50", option.active && "bg-ink-50", FOCUS)}
            >
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-ink-700">{option.detail}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function AdminNav(props: StudentNavProps) {
  const pathname = usePathname();
  const studentSide = [...TABS.map(({ href }) => href), "/onboarding", "/account"]
    .some((href) => isTabActive(pathname, href));
  const switcher = <WorkspaceSwitcher key={pathname} studentSide={studentSide} />;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white">
        {studentSide ? (
          <StudentNav {...props} workspaceSwitcher={switcher} />
        ) : (
          <div className="flex min-h-14 items-center justify-between gap-1 px-4 md:h-16 md:px-8">
            <div className="flex items-center gap-1 sm:gap-3">
              <Logo href="/admin" />
              {switcher}
            </div>
            <form action={props.logOut}>
              <button type="submit" className={cx("min-h-11 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-50", FOCUS)}>Log out</button>
            </form>
          </div>
        )}
      </header>
      {studentSide && <StudentTabBar uploadNeeded={props.uploadNeeded} withWorkspaceSwitcher />}
    </>
  );
}
