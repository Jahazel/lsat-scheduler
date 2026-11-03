import { cx } from "@/components/ui/classes";
import { CARD, CONTENT, GUTTER, LEAD } from "./ProgressOverview";

const TEXT_SIZED_BAR = "rounded bg-vellum-line text-transparent box-decoration-clone";

export default function ProgressLoading() {
  return (
    <div aria-hidden className="min-h-screen animate-pulse">
      <div className={cx("border-b border-vellum-line bg-paper pt-6 pb-6 md:pt-12 md:pb-10", GUTTER)}>
        <div className="flex flex-col gap-1.5 md:gap-3">
          <p className="text-h3 font-medium md:text-h2"><span className={TEXT_SIZED_BAR}>Progress</span></p>
          <p className="text-body md:text-lead"><span className={TEXT_SIZED_BAR}>{LEAD}</span></p>
        </div>
      </div>
      <div className={CONTENT}>
        <div className={CARD}>
          <div className="flex items-baseline justify-between gap-4 p-4 sm:px-6 sm:py-5">
            <p className="text-h5 font-medium tracking-heading"><span className={TEXT_SIZED_BAR}>November 2026</span></p>
            <span className={cx(TEXT_SIZED_BAR, "text-small")}>3 weeks</span>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex min-h-16 items-center gap-4 border-t border-vellum-line px-4 sm:gap-6 sm:px-6">
              <span className={cx(TEXT_SIZED_BAR, "text-body")}>Nov 16 – 22</span>
              <span className="h-1 flex-1 rounded-pill bg-vellum-line sm:max-w-80" />
              <span className={cx(TEXT_SIZED_BAR, "ml-auto text-small")}>0 of 19 done</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
