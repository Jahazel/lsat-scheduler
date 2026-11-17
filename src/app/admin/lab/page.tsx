import { PageArrival } from "@/components/PagePlaceholder";
import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { requireAdmin } from "../requireAdmin";

export default async function ScheduleLabPage() {
  await requireAdmin();
  return (
    <div data-page-fade className={cx(PAGE_COLUMN, "flex flex-col gap-2 pt-6 pb-12 md:pt-10")}>
      <PageArrival page="Schedule lab" />
      <h1 data-page-section className="text-h3 font-semibold text-ink">Schedule lab</h1>
      <p data-page-section className="text-small text-smoke">The Schedule lab is on its way. It will build a week from any inputs and save nothing.</p>
    </div>
  );
}
