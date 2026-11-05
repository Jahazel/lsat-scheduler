import { PageCue } from "@/components/SiteMotion";
import { ONBOARDING_COLUMN, ONBOARDING_GRID, PREVIEW_CARD, PREVIEW_PANEL, SKELETON } from "./shell";

const BLOCK = "rounded-sm bg-vellum-line";

export default function OnboardingLoading() {
  return (
    <div className={ONBOARDING_GRID}>
      <PageCue page="placeholder" />
      <div className={ONBOARDING_COLUMN}>
        <div data-page-swap className="w-full lg:max-w-[440px]">
          <div aria-hidden className="flex animate-pulse flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className={`h-4 w-36 ${BLOCK}`} />
              <div className={`h-8 w-64 ${BLOCK}`} />
              <div className={`h-5 w-full ${BLOCK}`} />
            </div>
            <div className="flex flex-col gap-4">
              <div className={`h-11 ${BLOCK}`} />
              <div className={`h-11 ${BLOCK}`} />
              <div className={`h-11 ${BLOCK}`} />
            </div>
            <div className={`h-12 w-full ${BLOCK}`} />
          </div>
        </div>
      </div>
      <aside data-page-fade aria-hidden className={PREVIEW_PANEL}>
        <div data-page-swap className={PREVIEW_CARD}>
          <div className="flex animate-pulse flex-col">
            <div className="flex h-14 items-center border-b border-vellum-line px-5 xl:px-7">
              <span className={`w-24 ${SKELETON}`} />
            </div>
            <div className="flex flex-col gap-4 px-5 pb-6 pt-8 xl:px-7">
              <span className={`w-32 ${SKELETON}`} />
              <span className="h-10 w-48 rounded bg-vellum" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
