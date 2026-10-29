import type { ReactNode } from "react";
import { InfoGlyph } from "./StatusIcon";
import { cx } from "./classes";

export type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  notes?: string[];
  aside?: ReactNode;
  gutter?: string;
  className?: string;
};

export function PageHeader({ eyebrow, title, lead, notes = [], aside, gutter = "px-5 md:px-18", className }: PageHeaderProps) {
  return (
    <header className={cx("border-b border-vellum-line bg-paper pt-6 pb-6 md:pt-12 md:pb-10", gutter, className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-3">
          {eyebrow && <p className="text-caption text-smoke md:text-small">{eyebrow}</p>}
          <h1 className="text-h3 font-medium text-ink md:text-h2">{title}</h1>
          {lead && <p className="text-body text-smoke md:text-lead">{lead}</p>}
          {notes.length > 0 && (
            <ul className="flex flex-col gap-1">
              {notes.map((note) => (
                <li key={note} className="flex items-center gap-2 text-small text-smoke">
                  <InfoGlyph />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
        {aside && <div className="shrink-0 lg:w-90">{aside}</div>}
      </div>
    </header>
  );
}
