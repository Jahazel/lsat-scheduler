import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { PINNED_BAR, ROAD_PANEL, STEP_COLUMN, STEP_CONTENT, STEP_GRID } from "./shell";

const FIELD = "h-11 rounded-sm bg-vellum-line";

function Label({ children }: { children: string }) {
  return <p className="text-small font-medium"><span className={PLACEHOLDER_SHAPE}>{children}</span></p>;
}

function Choices({ options }: { options: string[] }) {
  return (
    <div className="flex gap-1 rounded-sm bg-vellum p-1">
      {options.map((option, index) => (
        <span key={option} className={cx("flex h-9 flex-1 items-center justify-center rounded px-2 text-small", index === 0 && "bg-paper font-medium shadow-control")}>
          <span className={PLACEHOLDER_SHAPE}>{option}</span>
        </span>
      ))}
    </div>
  );
}

export default function OnboardingLoading() {
  return (
    <PagePlaceholder>
      <PageCue page="placeholder" />
      <div className={STEP_GRID}>
        <div className={STEP_COLUMN}>
          <div className={STEP_CONTENT}>
            <div className="flex w-full max-w-[440px] flex-col gap-8">
              <div className="flex flex-col gap-2">
                <p className="text-h3 font-semibold"><span className={PLACEHOLDER_SHAPE}>Hi there, set your goal score</span></p>
                <p className="text-body"><span className={PLACEHOLDER_SHAPE}>Where you are now, where you want to be, and when.</span></p>
              </div>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-3">
                  {["Current PT score", "Goal score"].map((label) => (
                    <div key={label} className="flex flex-col gap-2">
                      <Label>{label}</Label>
                      <span className={FIELD} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Goal test date</Label>
                  <span className={FIELD} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Test time</Label>
                  <Choices options={["Standard", "1.5× time", "2× time"]} />
                </div>
                <div className="flex flex-col gap-2 border-t border-vellum-line pt-6">
                  <Label>Official LSAT attempts</Label>
                  <Choices options={["None yet", "I've taken it"]} />
                </div>
              </div>
            </div>
          </div>
          <div className={PINNED_BAR}>
            <div className="mx-auto flex max-w-[440px] flex-col gap-3">
              <span className="flex h-12 items-center justify-center rounded-pill bg-vellum-line text-body font-medium text-transparent">Continue</span>
              <p className="text-center text-small"><span className={PLACEHOLDER_SHAPE}>Enter both scores to continue.</span></p>
            </div>
          </div>
        </div>
        <div className={ROAD_PANEL}>
          <div className="sticky top-30 flex flex-col gap-6 rounded-lg bg-paper p-8 shadow-e1">
            <div className="flex flex-col gap-1">
              <p className="text-small"><span className={PLACEHOLDER_SHAPE}>Hi there · standard time</span></p>
              <p className="text-h3 font-semibold"><span className={PLACEHOLDER_SHAPE}>Your road to test day</span></p>
            </div>
            <span className="h-30 rounded-sm bg-vellum" />
            <span className="h-36 rounded-md border border-vellum-line" />
          </div>
        </div>
      </div>
    </PagePlaceholder>
  );
}
