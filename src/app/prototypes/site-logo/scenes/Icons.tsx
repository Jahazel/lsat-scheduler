import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/classes";

const WEB = path.join(process.cwd(), "docs/design/site-logo/kit/web");
const png = (file: string) => `data:image/png;base64,${readFileSync(path.join(WEB, file)).toString("base64")}`;

function favicon(dark: boolean) {
  const svg = readFileSync(path.join(WEB, "favicon.svg"), "utf8");
  const darkRule = /@media \(prefers-color-scheme:dark\)\{([^}]*\})\}/;
  const shown = dark ? svg.replace(/<style>.*<\/style>/, `<style>${svg.match(darkRule)?.[1]}</style>`) : svg.replace(darkRule, "");
  return `data:image/svg+xml;base64,${Buffer.from(shown).toString("base64")}`;
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="bg-graphite px-5 py-2 font-mono text-label text-fog uppercase md:px-18">{children}</p>;
}

function Tab({ dark }: { dark: boolean }) {
  return (
    <div className={cx("flex items-end gap-1 px-3 pt-2", dark ? "bg-graphite" : "bg-silver-mist")}>
      <div className={cx("flex h-9 w-60 items-center gap-2 rounded-t-md px-3 text-small", dark ? "bg-graphite-raised text-chalk" : "bg-paper text-ink")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={favicon(dark)} alt="" className="size-4 shrink-0" />
        <span className="truncate">This week · DrillMap</span>
      </div>
      <div className={cx("flex h-9 w-60 items-center gap-2 px-3 text-small", dark ? "text-fog" : "text-smoke")}>
        <span className={cx("size-4 shrink-0 rounded-full", dark ? "bg-graphite-line" : "bg-paper")} />
        <span className="truncate">7Sage · Analytics</span>
      </div>
    </div>
  );
}

function HomeIcon({ src, label, round = false }: { src?: string; label: string; round?: boolean }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={cx("size-15", round ? "rounded-full" : "rounded-[22%]")} />
      ) : (
        <span className={cx("size-15 bg-chalk/25", round ? "rounded-full" : "rounded-[22%]")} />
      )}
      <span className="w-full truncate text-center text-[11px] text-chalk">{label}</span>
    </div>
  );
}

export function Icons() {
  const apple = png("apple-touch-icon.png");
  const maskable = png("maskable-512.png");
  return (
    <div className="flex flex-col">
      <Caption>Browser tab · light</Caption>
      <Tab dark={false} />
      <div className="h-16 bg-paper" />
      <Caption>Browser tab · dark (the SVG favicon switches to Silver Mist)</Caption>
      <Tab dark />
      <div className="h-16 bg-graphite-raised" />
      <Caption>Home screen · iPhone (Apple icon) and Android (maskable icon in a circle)</Caption>
      <div className="flex flex-wrap gap-x-16 gap-y-8 bg-gradient-to-b from-abyss-blue to-void-eclipse px-5 py-10 md:px-18">
        <div className="grid grid-cols-4 gap-5">
          <HomeIcon label="Calendar" />
          <HomeIcon src={apple} label="DrillMap" />
          <HomeIcon label="Notes" />
          <HomeIcon label="Mail" />
        </div>
        <div className="grid grid-cols-4 gap-5">
          <HomeIcon label="Chrome" round />
          <HomeIcon src={maskable} label="DrillMap" round />
          <HomeIcon label="Gmail" round />
          <HomeIcon label="Photos" round />
        </div>
      </div>
    </div>
  );
}
