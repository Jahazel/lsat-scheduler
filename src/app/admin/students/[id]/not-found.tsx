import { PAGE_COLUMN, cx } from "@/components/ui/classes";
import { AllStudentsLink } from "./StudentDetail";

export default function StudentNotFound() {
  return (
    <div className={cx(PAGE_COLUMN, "flex flex-col gap-2 pt-10 pb-12 md:pt-16")}>
      <h1 className="text-h3 font-semibold text-ink">Student not found</h1>
      <p className="text-small text-smoke">No student has this link.</p>
      <AllStudentsLink className="mt-1 text-accent pointer-hover:hover:text-ink" />
    </div>
  );
}
