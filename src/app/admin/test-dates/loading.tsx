import { PagePlaceholder } from "@/components/PagePlaceholder";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";

const SHAPE = "rounded bg-vellum-line";
const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";

export default function TestDatesLoading() {
  return (
    <PagePlaceholder>
      <div className={cx(PAGE_COLUMN, "flex flex-col gap-5 pt-6 pb-12 md:pt-10")}>
        <p className="text-h3 font-semibold text-ink">Test dates</p>
        <div className={cx(CARD, "flex flex-col gap-4 p-5")}>
          {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={cx(SHAPE, "h-10 w-full")} />)}
        </div>
      </div>
    </PagePlaceholder>
  );
}
