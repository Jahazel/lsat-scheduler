import type { ReactNode } from "react";

/** The weekly upload page's grid: the form column on the left and, from desktop width, a side panel on the right. */
export function UploadColumn({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] bg-paper lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-8 px-5 pt-8 pb-12 lg:px-30 lg:pt-18 lg:pb-18">{children}</div>
      {aside}
    </div>
  );
}
