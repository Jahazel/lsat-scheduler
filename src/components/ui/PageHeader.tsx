import type { ReactNode } from "react";
import { InfoGlyph } from "./StatusIcon";
import { cx } from "./classes";

export type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  // One week reason, shown after the lead behind a thin divider.
  note?: string;
  aside?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, lead, note, aside, className }: PageHeaderProps) {
  return (
    <header className={cx("border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-3">
          {eyebrow && <p className="text-caption text-smoke md:text-small">{eyebrow}</p>}
          <h1 className="text-h3 font-medium text-ink md:text-h2">{title}</h1>
          {(lead || note) && (
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-5">
              {lead && <p className="text-body text-smoke md:text-lead">{lead}</p>}
              {lead && note && <span aria-hidden className="hidden h-4 w-px bg-vellum-line md:block" />}
              {note && (
                <p className="flex items-center gap-2 text-small text-smoke">
                  <InfoGlyph />
                  {note}
                </p>
              )}
            </div>
          )}
        </div>
        {aside && <div className="shrink-0 lg:w-90">{aside}</div>}
      </div>
    </header>
  );
}
