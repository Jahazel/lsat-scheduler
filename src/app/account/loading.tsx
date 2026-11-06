import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";

const CARD = "rounded-md border border-vellum-line bg-paper p-5 md:p-8";
const BUTTON = "flex h-11 shrink-0 items-center justify-center rounded-sm border border-vellum-line bg-paper px-5 text-body leading-[20px] font-medium";
const REMOVED = ["Your profile", "Approved and legacy analytics snapshots", "Weekly schedules", "Activity check-ins"];

export default function AccountLoading() {
  return (
    <PagePlaceholder>
      <div className="min-h-screen bg-vellum">
        <div className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-18 md:pt-12 md:pb-10">
          <div className="mx-auto flex max-w-content flex-col gap-3">
            <p className="text-h3 font-semibold md:text-h2"><span className={PLACEHOLDER_SHAPE}>Account</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body md:text-lead"><span className={PLACEHOLDER_SHAPE}>amy@example.test</span></p>
              <span className="flex h-7 items-center rounded-pill border border-transparent bg-vellum-line px-3 text-small text-transparent">Google sign-in</span>
            </div>
          </div>
        </div>
        <div className="mx-auto box-content flex max-w-content flex-col gap-6 px-5 py-10 md:px-18 md:pt-16 md:pb-24">
          <div className={cx(CARD, "flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-16")}>
            <div className="flex flex-col gap-2">
              <p className="text-h4 font-semibold"><span className={PLACEHOLDER_SHAPE}>Sessions</span></p>
              <p className="text-body"><span className={PLACEHOLDER_SHAPE}>Sign out of every browser and device where you use DrillMap, including this one.</span></p>
            </div>
            <span className={BUTTON}><span className={PLACEHOLDER_SHAPE}>Sign out of all devices</span></span>
          </div>
          <div className={cx(CARD, "flex flex-col gap-8 md:flex-row md:justify-between md:gap-16")}>
            <div className="flex max-w-[560px] grow flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-h4 font-semibold"><span className={PLACEHOLDER_SHAPE}>Delete account</span></p>
                <p className="text-body"><span className={PLACEHOLDER_SHAPE}>This permanently removes from active storage:</span></p>
              </div>
              <div className="border-t border-vellum-line">
                {REMOVED.map((item) => (
                  <p key={item} className="border-b border-vellum-line py-3 text-body"><span className={PLACEHOLDER_SHAPE}>{item}</span></p>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col justify-end gap-4 md:w-[360px]">
              <div className="flex flex-col gap-2">
                <p className="text-small font-medium"><span className={PLACEHOLDER_SHAPE}>Type DELETE to confirm</span></p>
                <span className="h-11 rounded-sm bg-vellum-line" />
              </div>
              <span className={BUTTON}><span className={PLACEHOLDER_SHAPE}>Delete account</span></span>
            </div>
          </div>
        </div>
      </div>
    </PagePlaceholder>
  );
}
