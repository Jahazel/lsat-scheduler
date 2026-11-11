"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui/classes";
import { ON_LIGHT, ProtoLogo } from "./ProtoLogo";

type Place = "full" | "workspace" | "compact";
type Spot = { el: HTMLElement; holder: HTMLElement; place: Place };

function TopBarLogo({ place }: { place: Place }) {
  if (place === "compact") return <ProtoLogo form="small" className={cx("h-6", ON_LIGHT)} />;
  if (place === "workspace")
    return (
      <>
        <ProtoLogo form="small" className={cx("h-6 md:hidden", ON_LIGHT)} />
        <ProtoLogo form="horizontal" className={cx("hidden h-4.5 md:block", ON_LIGHT)} />
      </>
    );
  return <ProtoLogo form="horizontal" className={cx("h-4.5", ON_LIGHT)} />;
}

function placeOf(el: HTMLElement): Place {
  if (el.classList.contains("text-h5")) return "compact";
  if (el.closest('[data-site-header^="workspace"]')) return "workspace";
  return "full";
}

export function LogoSwap() {
  const [spots, setSpots] = useState<Spot[]>([]);

  useLayoutEffect(() => {
    const find = () => {
      const found = [...document.querySelectorAll<HTMLElement>("[data-proto-scene] [data-page-logo]")];
      setSpots((old) => {
        if (old.length === found.length && old.every((spot, i) => spot.el === found[i])) return old;
        return found.map((el) => {
          el.setAttribute("data-proto-swapped", "");
          const holder = el.querySelector<HTMLElement>(":scope > [data-proto-holder]") ?? el.appendChild(Object.assign(document.createElement("span"), { className: "contents" }));
          holder.setAttribute("data-proto-holder", "");
          return { el, holder, place: placeOf(el) };
        });
      });
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return spots.map((spot, i) => createPortal(<TopBarLogo place={spot.place} />, spot.holder, `logo-${i}`));
}
