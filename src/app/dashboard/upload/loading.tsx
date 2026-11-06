import { PLACEHOLDER_SHAPE, cx } from "@/components/ui/classes";
import { PagePlaceholder } from "@/components/PagePlaceholder";

const BLOCK = "bg-vellum-line";

function Line({ text, className }: { text: string; className: string }) {
  return <p className={className}><span className={PLACEHOLDER_SHAPE}>{text}</span></p>;
}

function GroupHead({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cx(PLACEHOLDER_SHAPE, "text-body font-semibold")}>{title}</span>
      <span className={cx(PLACEHOLDER_SHAPE, "text-small")}>{count}</span>
    </div>
  );
}

function Drop({ label }: { label: string }) {
  return (
    <div className="flex h-[104px] w-full items-center gap-4 rounded-md border-[1.5px] border-dashed border-ink/muted bg-vellum px-6">
      <span className={cx(BLOCK, "size-11 shrink-0 rounded-pill")} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold"><span className={PLACEHOLDER_SHAPE}>{label}</span></span>
        <span className="text-small"><span className={PLACEHOLDER_SHAPE}>Drop it here or choose a file</span></span>
      </span>
    </div>
  );
}

export default function WeeklyUploadLoading() {
  return (
    <PagePlaceholder>
      <div className="grid grid-cols-[minmax(0,1fr)] bg-paper lg:min-h-[calc(100vh-var(--spacing-18))] lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="flex flex-col gap-10 px-5 pt-8 lg:px-30 lg:pt-18">
          <div className="flex flex-col gap-2">
            <Line className="text-h3 font-semibold" text="Plan this week" />
            <Line className="text-body" text="Your plan starts today and runs to Sunday, Nov 8. Last week had no practice test, so we need only your 2 analytics screenshots." />
          </div>

          <div className="flex flex-col gap-2">
            <Line className="text-small font-medium" text="Current score" />
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <span className={cx(BLOCK, "h-11 w-24 shrink-0 rounded-md")} />
              <Line className="text-small" text="From your study settings. Type a new score if your latest practice test changed it. We save it there too." />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <GroupHead title="7Sage analytics" count="Screenshots or typed" />
            <div className="flex gap-1 rounded-sm bg-vellum p-1">
              <span className="flex h-9 flex-1 items-center justify-center rounded-[4px] bg-paper px-2 text-small font-medium shadow-control">
                <span className={PLACEHOLDER_SHAPE}>Screenshots</span>
              </span>
              <span className="flex h-9 flex-1 items-center justify-center px-2 text-small">
                <span className={PLACEHOLDER_SHAPE}>Type them</span>
              </span>
            </div>
            <Drop label="Logical Reasoning screenshot" />
            <Drop label="Reading Comprehension screenshot" />
            <Line className="text-small" text="PNG, JPG, or WEBP, 4 MB or less each. Tall screenshots are fine." />
            <Line className="text-small" text="Your screenshot is sent to Anthropic to read your analytics. Anthropic keeps it for up to 30 days. DrillMap does not store it. Crop out anything you do not want to share." />
          </div>

          <div className="flex flex-col gap-3">
            <GroupHead title="Practice test review" count="Not needed this week" />
            <div className="flex gap-3 rounded-md bg-vellum p-5">
              <span className={cx(BLOCK, "mt-0.5 size-3.5 shrink-0 rounded-pill")} />
              <div className="flex flex-col gap-1">
                <Line className="text-small font-medium" text="No practice test on last week's plan" />
                <Line className="text-small" text="This week's order comes from your analytics only. No question type goes first from a practice test." />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 pt-10 lg:row-span-2 lg:border-l lg:border-vellum-line lg:bg-vellum lg:p-18">
          <div className="flex flex-col gap-5 rounded-md border border-vellum-line p-5 lg:max-w-[560px] lg:rounded-none lg:border-0 lg:p-0">
            <Line className="hidden text-h5 font-semibold lg:block" text="Where to find it" />
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <span className="flex flex-col gap-1">
                <span className="text-body font-medium"><span className={PLACEHOLDER_SHAPE}>Where to find it</span></span>
                <span className="text-small"><span className={PLACEHOLDER_SHAPE}>Your 7Sage Analytics page</span></span>
              </span>
              <span className={cx(BLOCK, "size-3 shrink-0 rounded-sm")} />
            </div>
            <div className="hidden flex-col gap-1 lg:flex">
              <Line className="text-small font-medium" text="7Sage analytics" />
              <Line className="text-small" text="Same as when you signed up: the Logical Reasoning and Reading Comprehension parts of your Analytics page." />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 pt-10 pb-12 lg:px-30 lg:pb-18">
          <div className={cx(BLOCK, "flex h-12 w-full items-center justify-center rounded-pill text-body font-medium text-transparent")}>Read my screenshots</div>
          <Line className="text-center text-small" text="Add both screenshots, or type your analytics. You check every value before it counts." />
        </div>
      </div>
    </PagePlaceholder>
  );
}
