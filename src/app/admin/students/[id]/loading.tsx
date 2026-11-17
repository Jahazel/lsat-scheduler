import { PAGE_COLUMN, PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { DETAIL_CARD } from "./ThisWeekPanel";

const SHAPE = "rounded bg-vellum-line";
const FACT_LABELS = ["Score", "Test", "Study time", "Joined", "Past weeks"];

export default function AdminStudentLoading() {
  return (
    <PagePlaceholder>
      <div className={cx(PAGE_COLUMN, "flex flex-col gap-6 pt-6 pb-12 md:pt-10")}>
        <span className={cx(PLACEHOLDER_SHAPE, "w-fit text-small font-medium")}>← All students</span>
        <div className={cx(DETAIL_CARD, "flex flex-col gap-5 p-5 md:p-6")}>
          <div className="flex items-start gap-4">
            <span className="size-12 shrink-0 rounded-pill bg-vellum-line" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <span className={cx(SHAPE, "h-5 w-44 max-w-full")} />
              <span className={cx(SHAPE, "h-3.5 w-56 max-w-full")} />
              <span className={cx(SHAPE, "h-5 w-32 rounded-pill")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-vellum-line pt-5 sm:grid-cols-3 lg:grid-cols-5">
            {FACT_LABELS.map((label) => <div key={label} className="flex flex-col items-start gap-1.5"><span className={cx(PLACEHOLDER_SHAPE, "text-caption")}>{label}</span><span className={cx(SHAPE, "h-4 w-24")} /></div>)}
          </div>
        </div>
        <span className={cx(SHAPE, "h-6 w-48")} />
        {[0, 1].map((i) => (
          <div key={i} className={cx(DETAIL_CARD, "flex flex-col gap-3 p-5")}>
            <span className={cx(SHAPE, "h-4 w-32")} />
            {[0, 1, 2].map((j) => <span key={j} className={cx(SHAPE, "h-4 w-full max-w-md")} />)}
          </div>
        ))}
      </div>
    </PagePlaceholder>
  );
}
