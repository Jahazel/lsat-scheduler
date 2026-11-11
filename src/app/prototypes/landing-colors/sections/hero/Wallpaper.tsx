import { HeroCards } from "./HeroCards";
import { HeroCopy, ProductScreen } from "./parts";

export function Wallpaper() {
  return (
    <section aria-labelledby="landing-title" className="relative isolate flex w-full flex-col items-center overflow-y-clip px-5 pt-[86px] pb-12 md:px-0 md:pt-[184px] lg:pt-[166px]">
      <HeroCopy />
      <HeroCards />
      <div className="relative mt-10 flex w-full justify-center md:mt-[244px] lg:mt-[200px] min-[1360px]:mt-[128px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-3 -top-8 bottom-[-24px] -z-10 rounded-[24px] bg-[linear-gradient(to_bottom_in_oklab,#0B0B0B_0%,#2B3B79_45%,#E4E4E4_100%)] md:inset-x-[calc(50%-392px)] md:-top-14 md:rounded-[32px] lg:inset-x-[calc(50%-min(616px,50%-8px))] lg:-top-16"
        />
        <ProductScreen className="border-paper/30 bg-paper/20 shadow-[0_30px_80px_rgb(11_11_11/0.35)]" />
      </div>
    </section>
  );
}
