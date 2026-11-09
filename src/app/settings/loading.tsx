import type { ReactNode } from "react";
import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";

const FIELD = "h-11 rounded-sm bg-vellum-line";
const SELECT = "h-[34px] min-w-0 flex-1 rounded-sm bg-vellum-line";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SECTION = "flex flex-col gap-5 border-t-8 border-vellum bg-paper px-5 pt-7 pb-8 md:gap-6 md:rounded-md md:border md:border-vellum-line md:p-6 lg:p-8";

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div className={SECTION}>
      <div className="flex flex-col gap-1">
        <p className="text-h4 font-semibold"><span className={PLACEHOLDER_SHAPE}>{title}</span></p>
        <p className="text-body"><span className={PLACEHOLDER_SHAPE}>{lede}</span></p>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <p className="text-small font-medium"><span className={PLACEHOLDER_SHAPE}>{children}</span></p>;
}

function Durations() {
  return (
    <span className="flex gap-2">
      <span className={SELECT} />
      <span className={SELECT} />
    </span>
  );
}

export default function StudySettingsLoading() {
  return (
    <PagePlaceholder>
      <div className="min-h-screen bg-vellum">
        <div className="border-b border-vellum-line bg-paper px-5 pt-6 pb-6 md:px-8 md:pt-10 md:pb-8 lg:px-18 lg:pt-12 lg:pb-10">
          <div className="mx-auto flex max-w-content flex-col gap-3">
            <p className="text-h3 font-semibold md:text-h2"><span className={PLACEHOLDER_SHAPE}>Study settings</span></p>
            <p className="text-body md:text-lead"><span className={PLACEHOLDER_SHAPE}>Your goal and your week. Changes apply to your next weekly schedule.</span></p>
          </div>
        </div>
        <div className="flex flex-col md:mx-auto md:box-content md:max-w-content md:gap-6 md:px-8 md:pt-8 md:pb-16 lg:px-18 lg:pt-16 lg:pb-24">
          <Section title="Goal" lede="Where you are now, where you want to be, and when.">
            <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 md:gap-x-6 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label>Current PT score</Label>
                <p className="flex h-11 items-center text-h4 font-semibold tabular-nums"><span className={PLACEHOLDER_SHAPE}>150</span></p>
                <p className="text-caption"><span className={PLACEHOLDER_SHAPE}>Updates with each weekly upload</span></p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Goal score</Label>
                <span className={FIELD} />
              </div>
              <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
                <Label>Goal test month</Label>
                <span className={FIELD} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-small font-medium"><span className={PLACEHOLDER_SHAPE}>Test time</span></legend>
                  <div className="flex gap-1 rounded-sm bg-vellum p-1">
                    {["Standard", "1.5× time", "2× time"].map((choice, index) => (
                      <span
                        key={choice}
                        className={cx("flex h-9 flex-1 items-center justify-center rounded text-small", index === 0 && "bg-paper font-medium shadow-control")}
                      >
                        <span className={PLACEHOLDER_SHAPE}>{choice}</span>
                      </span>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:max-w-[640px]">
              <div className="flex flex-col items-start gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3">
                <span className={cx(PLACEHOLDER_SHAPE, "text-small font-medium")}>Official LSAT attempts</span>
                <span className={cx(PLACEHOLDER_SHAPE, "text-caption")}>For your record. It does not change your plan.</span>
              </div>
              <p className="py-1 text-small"><span className={PLACEHOLDER_SHAPE}>No official attempts yet</span></p>
              <p className="flex items-center gap-2 self-start pt-1 text-small font-medium">
                <span className="size-3.5 rounded bg-vellum-line" />
                <span className={PLACEHOLDER_SHAPE}>Add attempt</span>
              </p>
            </div>
          </Section>

          <Section title="Week" lede="How much time you can study each day. Each day needs at least 30 min.">
            <div className="flex items-start gap-10">
              <div className="min-w-0 flex-1 lg:grow-0 lg:basis-[560px]">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-12 lg:w-20" />
                    <col />
                    <col className="w-[60px] lg:w-[100px]" />
                  </colgroup>
                  <thead>
                    <tr className="text-caption">
                      <td className="pb-2 pl-2 text-left lg:pl-3"><span className={PLACEHOLDER_SHAPE}>Day</span></td>
                      <td className="pb-2 text-left"><span className={PLACEHOLDER_SHAPE}>Study time</span></td>
                      <td className="pb-2 text-center"><span className={PLACEHOLDER_SHAPE}>Practice test</span></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-vellum">
                      <td className="rounded-l-sm py-2 pl-2 text-left text-small font-medium lg:pl-3">
                        <span className={PLACEHOLDER_SHAPE}>All<span className="hidden lg:inline"> days</span></span>
                      </td>
                      <td className="py-2"><Durations /></td>
                      <td className="rounded-r-sm py-2 text-center">
                        <span className="inline-flex h-[34px] items-center rounded-sm border border-vellum-line bg-paper px-2 text-small font-medium lg:px-3">
                          <span className={PLACEHOLDER_SHAPE}>Apply</span>
                        </span>
                      </td>
                    </tr>
                    {DAYS.map((day) => (
                      <tr key={day} className="border-b border-vellum-line">
                        <td className="py-1 pl-2 text-left text-small font-medium lg:pl-3"><span className={PLACEHOLDER_SHAPE}>{day}</span></td>
                        <td className="py-1"><Durations /></td>
                        <td className="py-1 text-center">
                          <span className="inline-flex size-11 items-center justify-center">
                            <span className="size-5 rounded-pill border border-vellum-line" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col gap-1 px-2 pt-5 lg:px-3">
                  <p className="flex items-baseline justify-between">
                    <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>Weekly total</span>
                    <span className={cx(PLACEHOLDER_SHAPE, "text-body font-semibold")}>10 h 30</span>
                  </p>
                  <p className="text-small"><span className={PLACEHOLDER_SHAPE}>A full practice test takes 2 h 30 with standard time.</span></p>
                </div>
              </div>
              <div className="hidden min-w-[280px] flex-1 flex-col gap-5 self-stretch border-l border-vellum-line pl-10 lg:flex">
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-label uppercase"><span className={PLACEHOLDER_SHAPE}>Preview · next weekly schedule</span></p>
                  <p className="text-h3 font-semibold tabular-nums"><span className={PLACEHOLDER_SHAPE}>150 → 165</span></p>
                  <p className="text-small"><span className={PLACEHOLDER_SHAPE}>by June 2027 · 10 h 30 a week</span></p>
                </div>
                <div className="flex flex-col gap-2 border-t border-vellum-line pt-4">
                  {DAYS.map((day) => (
                    <p key={day} className="flex items-center gap-3 text-small">
                      <span className="w-9 shrink-0"><span className={PLACEHOLDER_SHAPE}>{day}</span></span>
                      <span className="h-5 min-w-0 flex-1 rounded bg-vellum-line" />
                      <span className="w-14 shrink-0 text-right tabular-nums"><span className={PLACEHOLDER_SHAPE}>1 h 30</span></span>
                    </p>
                  ))}
                </div>
                <p className="text-small"><span className={PLACEHOLDER_SHAPE}>Updates as you edit. This week stays as it is.</span></p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </PagePlaceholder>
  );
}
