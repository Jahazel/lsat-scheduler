import { cx } from "@/components/ui/classes";
import { SCANNING_OFF } from "@/lib/screenshotUpload";

export function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className={cx("size-[18px] shrink-0 text-warning-ink", className)}>
      <circle cx="9" cy="9" r="7.25" fill="none" className="stroke-current" strokeWidth="1.5" />
      <path d="M6.5 6.5v5M11.5 6.5v5" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ScanningOffNote({ children }: { children: string }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-md border border-warning/45 px-4 py-3.5">
      <PauseGlyph className="mt-px" />
      <div className="flex flex-1 flex-col gap-0.5 text-small leading-5">
        <p className="font-semibold text-ink">{SCANNING_OFF}</p>
        <p className="text-smoke">{children}</p>
      </div>
    </div>
  );
}
