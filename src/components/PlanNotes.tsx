import { Card } from "@/components/ui/Card";
import type { PlanNote } from "@/lib/planNotes";

export function PlanNotice({ note }: { note: PlanNote }) {
  return (
    <section aria-label="Your plan" className="flex items-start gap-3 rounded-md border border-vellum-line bg-vellum p-5">
      <svg aria-hidden viewBox="0 0 24 24" className="mt-[3px] size-[18px] shrink-0 text-smoke" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-h6 font-medium text-ink">{note.lead}</h2>
        <p className="text-small text-smoke">{note.rest}</p>
      </div>
    </section>
  );
}

export function HeldWeek() {
  return (
    <Card className="items-center gap-3 px-6 py-14 text-center md:py-20">
      <span className="mb-1 flex size-12 items-center justify-center rounded-pill bg-vellum text-smoke">
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      </span>
      <h2 className="text-h5 font-medium text-ink">Your week is ready.</h2>
      <p className="max-w-[36ch] text-small text-smoke">It appears when your first payment goes through.</p>
    </Card>
  );
}
