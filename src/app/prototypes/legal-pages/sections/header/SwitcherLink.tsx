"use client";

import type { LegalPage } from "../../content";
import { goToPage } from "../../protoContext";

export function SwitcherLink({ page, current, className }: { page: LegalPage; current: boolean; className: string }) {
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
      {page.switcherLabel}
    </a>
  );
}
