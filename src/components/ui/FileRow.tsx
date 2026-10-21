import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "./classes";

export type FileRowProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  detail: ReactNode;
  action?: ReactNode;
  tone?: "default" | "danger";
  ref?: Ref<HTMLDivElement>;
};

function ScreenshotThumb() {
  return (
    <span aria-hidden className="hidden h-12 w-16 shrink-0 flex-col justify-center gap-1 rounded border border-vellum-line bg-vellum p-2 sm:flex">
      <span className="h-[3px] w-9 rounded-sm bg-ink/30" />
      <span className="h-[3px] w-11 rounded-sm bg-ink/20" />
      <span className="h-[3px] w-7 rounded-sm bg-ink/20" />
      <span className="h-[3px] w-10 rounded-sm bg-ink/20" />
    </span>
  );
}

export function FileRow({ title, detail, action, tone = "default", children, className, ...props }: FileRowProps) {
  return (
    <div
      {...props}
      className={cx(
        "flex flex-col gap-3 rounded-md border p-4 outline-none",
        tone === "danger" ? "border-danger" : "border-vellum-line",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <ScreenshotThumb />
        <div className="flex min-w-0 grow flex-col gap-0.5 text-small">
          <span className="font-medium text-ink">{title}</span>
          {detail}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ProblemNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-small text-danger-ink">
      <svg aria-hidden viewBox="0 0 14 14" className="mt-0.5 size-3.5 shrink-0">
        <circle cx="7" cy="7" r="6" fill="none" className="stroke-current" strokeWidth="1.3" />
        <path d="M7 4v3.5" fill="none" className="stroke-current" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 9.8v.01" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
