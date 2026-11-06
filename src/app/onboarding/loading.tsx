import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { PageCue } from "@/components/SiteMotion";
import { SkeletonDays } from "./LivePreview";
import { ONBOARDING_COLUMN, ONBOARDING_GRID, PREVIEW_CARD, PREVIEW_PANEL, SKELETON } from "./shell";

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
      <div className={ONBOARDING_GRID}>
        <div className={ONBOARDING_COLUMN}>
          <div className="w-full lg:max-w-[440px]">
            <p className="mb-2 font-mono text-label uppercase"><span className={PLACEHOLDER_SHAPE}>Step 1 of 4 · Goal</span></p>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <p className="text-h3 font-semibold"><span className={PLACEHOLDER_SHAPE}>Set your target</span></p>
                <p className="text-body"><span className={PLACEHOLDER_SHAPE}>Where you are now, where you want to be, and when.</span></p>
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex gap-3">
                  {["Current PT score", "Goal score"].map((label) => (
                    <div key={label} className="flex flex-1 flex-col gap-2">
                      <Label>{label}</Label>
                      <span className={FIELD} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Goal test date</Label>
                  <span className={FIELD} />
                </div>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-small font-medium"><span className={PLACEHOLDER_SHAPE}>Test time</span></legend>
                  <Choices options={["Standard", "1.5× time", "2× time"]} />
                </fieldset>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cx(PLACEHOLDER_SHAPE, "text-small font-medium")}>Official LSAT attempts</span>
                    <span className="text-right text-caption"><span className={PLACEHOLDER_SHAPE}>For your record. It does not change your plan.</span></span>
                  </div>
                  <Choices options={["None yet", "I've taken it"]} />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <span className={cx(FIELD, "flex items-center justify-center text-body font-medium text-transparent")}>Continue</span>
                <p className="text-center text-small"><span className={PLACEHOLDER_SHAPE}>Enter both scores to continue.</span></p>
              </div>
            </div>
          </div>
        </div>
        <div className={PREVIEW_PANEL}>
          <div className={PREVIEW_CARD}>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-vellum-line px-5 xl:px-7">
              <div className="flex items-center gap-5">
                <span className={cx(PLACEHOLDER_SHAPE, "text-body font-semibold tracking-[-0.02em]")}>DrillMap</span>
                <span className="flex h-7 items-center rounded-full bg-vellum-line px-3 text-small font-medium text-transparent">This week</span>
                <span className={`hidden w-14 xl:block ${SKELETON}`} />
                <span className={`hidden w-20 xl:block ${SKELETON}`} />
              </div>
              <span className="size-[30px] rounded-full bg-vellum-line" />
            </div>
            <div className="flex flex-col gap-2.5 px-5 pb-6 pt-8 xl:px-7">
              <p className="text-small"><span className={PLACEHOLDER_SHAPE}>Hi there · 7Sage · standard time</span></p>
              <p className="text-[40px] font-semibold leading-[44px] tracking-display"><span className={PLACEHOLDER_SHAPE}>— → —</span></p>
            </div>
            <div className="flex grow flex-col gap-3 border-t border-vellum-line bg-vellum px-5 py-6 xl:px-7">
              <SkeletonDays />
            </div>
          </div>
        </div>
      </div>
    </PagePlaceholder>
  );
}
