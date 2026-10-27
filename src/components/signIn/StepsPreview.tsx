import { cx } from "@/components/ui/classes";
import { PreviewHeader } from "./SignInFrame";

const STEPS = [
  { title: "Set your goal score", tag: "Goal" },
  { title: "Pick your study days", tag: "Week" },
  { title: "Add your 7Sage analytics", tag: "Analytics" },
  { title: "Check your first week", tag: "Review" },
];

export function StepsPreview() {
  return (
    <>
      <PreviewHeader label="After you sign up" detail="4 steps" />
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step.tag} className="flex items-center gap-3">
            <span className={cx("w-6 shrink-0 font-mono text-mono", index === 0 ? "text-accent" : "text-fog")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="grow text-body leading-[20px] text-ink">{step.title}</span>
            <span className="font-mono text-mono text-smoke">{step.tag}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-vellum-line pt-4 text-small font-medium text-accent">Then your weekly plan is ready.</p>
    </>
  );
}
