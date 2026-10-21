import type { ReactNode } from "react";
import { cx } from "./classes";

export type PillTone = "accent" | "muted" | "solid";

const TONES: Record<PillTone, string> = {
  accent: "border border-dashed border-accent text-accent",
  muted: "border border-dashed border-fog text-smoke",
  solid: "bg-accent text-paper",
};

export function PillTag({ tone = "accent", icon, children, className }: { tone?: PillTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption font-medium whitespace-nowrap", TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
