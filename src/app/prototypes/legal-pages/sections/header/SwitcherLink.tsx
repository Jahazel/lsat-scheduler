"use client";

import type { ReactNode } from "react";
import type { LegalPage } from "../../content";
import { goToPage } from "../../protoContext";

export function SwitcherLink({ page, current, className, children }: { page: LegalPage; current: boolean; className: string; children?: ReactNode }) {
  return (
    <a
      href={`/legal/${page.id}`}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        if (!current) goToPage(page.id);
      }}
      className={className}
    >
      {children ?? page.switcherLabel}
    </a>
  );
}
