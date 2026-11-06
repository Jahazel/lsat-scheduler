import { Card } from "@/components/ui/Card";
import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";

const DOT = "shrink-0 rounded-pill bg-vellum-line";

const DAYS: { day: string; kind: string; rows: string[] }[] = [
  { day: "Monday Nov 2", kind: "Drilling · 1 h 30 min of 1 h 30 min", rows: ["10 Necessary + Sufficient assumption (L2-4)", "1 RC Passage Science L3"] },
  { day: "Tuesday Nov 3", kind: "Drilling · 1 h 30 min of 1 h 30 min", rows: ["5 Flaw or descriptive weakening (L2-4)", "5 Parallel method (L3-5)", "1 Full LR Section"] },
  { day: "Wednesday Nov 4", kind: "Drilling · 1 h 30 min of 1 h 30 min", rows: ["10 Strengthen + Weaken (L2-4)", "5 PSA - find the rule (L2-4)", "5 Inference (L2-4)"] },
  { day: "Thursday Nov 5", kind: "Rest day · 0 min of 1 h 30 min", rows: [] },
  { day: "Friday Nov 6", kind: "Practice test · 3 h 30 min of 1 h 30 min", rows: ["Practice Test (from PT 130+)"] },
  { day: "Saturday Nov 7", kind: "Practice-test review · 1 h 30 min of 1 h 30 min", rows: ["PT Review + Blind Review"] },
  { day: "Sunday Nov 8", kind: "Drilling · 1 h 30 min of 1 h 30 min", rows: ["5 Must be true (L3-5)"] },
];

export function ThisWeekShapes({ lead }: { lead: boolean }) {
  return (
    <>
      <div className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-3">
            <p className="text-caption md:text-small"><span className={PLACEHOLDER_SHAPE}>Week of November 2</span></p>
            <p className="text-h3 font-medium md:text-h2"><span className={PLACEHOLDER_SHAPE}>Your plan for this week</span></p>
            {lead && <p className="text-body md:text-lead"><span className={PLACEHOLDER_SHAPE}>Your plan is set. Check off as you go.</span></p>}
            <p className="flex items-center gap-2 text-small">
              <span className={cx(DOT, "size-3.5")} />
              <span className={PLACEHOLDER_SHAPE}>Necessary assumption comes first this week. You missed it most on your last practice test.</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 pb-0.5 lg:w-90">
            <div className="flex items-baseline justify-between gap-4">
              <span className={cx(PLACEHOLDER_SHAPE, "text-h4 font-medium")}>13 remaining</span>
              <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>6 of 19 done</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-2 rounded-pill bg-vellum-line" />
              <div className="flex min-h-4.5 flex-col items-end">
                <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>On pace</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-8 pb-16 md:px-18 md:pt-16 md:pb-24">
        {DAYS.map(({ day, kind, rows }) => (
          <Card key={day} className={rows.length === 0 ? "gap-2" : undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2">
              <p className="text-h6 font-medium"><span className={PLACEHOLDER_SHAPE}>{day}</span></p>
              <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>{kind}</span>
            </div>
            {rows.length === 0 ? (
              <p className="px-2 text-small"><span className={PLACEHOLDER_SHAPE}>Rest day. Nothing planned.</span></p>
            ) : (
              <div className="flex flex-col">
                {rows.map((row) => (
                  <div key={row} className="flex min-h-9 items-start gap-0.5">
                    <span className="flex h-9 w-8 shrink-0 items-center justify-center"><span className={cx(DOT, "size-4")} /></span>
                    <span className="min-w-0 flex-1 py-[9px] text-small"><span className={PLACEHOLDER_SHAPE}>{row}</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
