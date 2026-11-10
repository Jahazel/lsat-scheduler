import { planStatusLabel, type PlanStatus } from "@/lib/planStatus";

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span
      data-plan-status={status.kind}
      className="inline-flex items-center rounded-full bg-vellum-line px-2 py-0.5 text-caption font-medium text-smoke"
    >
      {planStatusLabel(status)}
    </span>
  );
}
