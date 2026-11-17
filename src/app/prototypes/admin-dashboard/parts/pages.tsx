"use client";

import { cx } from "@/components/ui/classes";
import type { Page } from "../view";

export type Go = (page: Page) => void;

const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const SHAPE = "rounded bg-vellum-line";

export function MissingStudent({ go }: { go: Go }) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-h3 font-semibold text-ink">Student not found</h1>
      <p className="text-small text-smoke">No student has this link.</p>
      <button type="button" onClick={() => go("students")} className="text-small font-medium text-accent">← All students</button>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <span className={cx(SHAPE, "h-8 w-40")} />
      <div className={cx(CARD, "flex flex-col gap-4 p-5")}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={cx(SHAPE, "h-12 w-full")} />)}
      </div>
    </div>
  );
}
