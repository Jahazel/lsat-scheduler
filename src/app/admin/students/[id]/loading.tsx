import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { ThisWeekShapes } from "@/components/ThisWeekShapes";

export default function AdminStudentLoading() {
  return (
    <PagePlaceholder>
      <div className="bg-paper px-5 pt-6 md:px-18">
        <div className="flex items-center justify-between gap-4">
          <span className={cx(PLACEHOLDER_SHAPE, "text-small font-medium")}>← All students</span>
          <span className="inline-flex items-center rounded-full bg-vellum-line px-2.5 py-1 text-caption font-medium text-transparent">Viewing as admin — read only</span>
        </div>
        <p className="mt-4 text-small"><span className={PLACEHOLDER_SHAPE}>amy@example.test</span></p>
      </div>
      <ThisWeekShapes />
    </PagePlaceholder>
  );
}
