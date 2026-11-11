import Image from "next/image";
import Link from "next/link";
import { FOCUS, cx } from "@/components/ui/classes";
import { FREE_WEEK_NOTE } from "@/components/landing/StartFreeWeekLink";

const SCREEN_SIZES = "(min-width: 1024px) 1120px, (min-width: 768px) 672px, 840px";
const SCREEN_IMAGE = "block h-auto w-[840px] max-w-none md:w-[672px] lg:w-[1120px]";

export function HeroCopy() {
  return (
    <>
      <div className="relative z-2 flex w-full flex-col items-center gap-4 text-center md:w-[680px] md:gap-5 lg:w-[800px] lg:gap-6">
        <h1
          id="landing-title"
          tabIndex={-1}
          className="text-[42px]/[44px] font-semibold tracking-[-0.04em] text-balance text-[#0B0B0B] outline-none md:text-[58px]/[60px] lg:text-[76px]/[78px]"
        >
          Your practice results, turned into next week&apos;s plan
        </h1>
        <p className="text-body text-[#5C5C5C] md:w-[520px] md:text-[18px]/[28px] lg:w-[600px] lg:text-lead">
          Upload your analytics every weekend. DrillMap builds Monday to Sunday around the question types you miss most.
        </p>
      </div>
      <div className="relative z-2 flex w-full flex-col items-center gap-3 pt-6 md:gap-[14px] md:pt-7 lg:pt-9">
        <StartButton className="h-[52px] w-full px-7 sm:w-auto" />
        <p className="text-small text-[#5C5C5C]">{FREE_WEEK_NOTE}</p>
      </div>
    </>
  );
}

export function StartButton({ className }: { className?: string }) {
  return (
    <Link
      href="/signup"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-sm text-body leading-[20px] font-medium whitespace-nowrap",
        "[transition:background-color_var(--duration-fast)_ease,scale_var(--duration-fast)_var(--ease-out-strong)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
        "bg-[#0B0B0B] text-paper [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#2B3B79]",
        FOCUS,
        className,
      )}
    >
      Start free week
    </Link>
  );
}

export function ProductScreen({ className }: { className?: string }) {
  return (
    <div className={cx("relative z-2 w-full rounded-[22px] border border-paper/60 bg-[#F2F2F2] p-2 shadow-[0_30px_80px_rgb(11_11_11/0.18)] md:w-[688px] md:p-2 lg:w-[min(1136px,calc(100%-32px))]", className)}>
      <div className="h-[460px] overflow-clip rounded-[14px] border border-[#D9D9D9] bg-paper md:h-[432px] lg:h-[720px]">
        <Image src="/landing/hero-app-nav.png" alt="" width={2880} height={144} sizes={SCREEN_SIZES} loading="eager" className={SCREEN_IMAGE} />
        <Image
          src="/landing/hero-this-week.png"
          alt="This week screen: your plan for this week, with Monday to Sunday drills"
          width={2880}
          height={3094}
          sizes={SCREEN_SIZES}
          loading="eager"
          className={SCREEN_IMAGE}
        />
      </div>
    </div>
  );
}
