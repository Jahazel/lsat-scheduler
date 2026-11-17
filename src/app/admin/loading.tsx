import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";

const SHAPE = "rounded bg-vellum-line";
const CARD = "rounded-lg border border-vellum-line bg-paper shadow-control";
const COUNT_WIDTHS = ["w-20", "w-28", "w-26", "w-30", "w-28", "w-40"];

export default function StudentsLoading() {
  return (
    <PagePlaceholder>
      <div className={cx(PAGE_COLUMN, "flex flex-col gap-5 pt-6 pb-12 md:pt-10")}>
        <div className="flex flex-col gap-2">
          <p className="text-h3 font-semibold text-ink">Students</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 py-0.5">{COUNT_WIDTHS.map((width, i) => <span key={i} className={cx(SHAPE, "h-3.5", width)} />)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx(SHAPE, "h-10 basis-full rounded-pill sm:flex-1 sm:basis-auto lg:max-w-sm")} />
          <span className={cx(SHAPE, "h-10 w-24 rounded-pill")} />
          <span className={cx(SHAPE, "ml-auto h-10 w-32 rounded-pill sm:ml-0 lg:hidden")} />
        </div>
        <div className={cx(CARD, "overflow-hidden")}>
          <div className="hidden h-11 items-center border-b border-vellum-line bg-vellum/50 px-5 lg:flex"><span className={cx(SHAPE, "h-3 w-16")} /></div>
          <ul className="divide-y divide-vellum-line">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4 lg:py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-60"><span className={cx(SHAPE, "h-3.5 w-36")} /><span className={cx(SHAPE, "h-3 w-48 max-w-full")} /></span>
                <span className={cx(SHAPE, "hidden h-5 w-16 rounded-pill lg:block")} />
                <span className={cx(SHAPE, "ml-auto hidden h-3 w-full max-w-md lg:block")} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PagePlaceholder>
  );
}
