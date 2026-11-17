import type { ReactNode } from "react";

export function LabTitle({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 font-semibold text-ink">Schedule lab</h1>
        <p className="text-small text-smoke">Type inputs and see the week the engine builds. Nothing here is saved.</p>
      </div>
      {children}
    </div>
  );
}
