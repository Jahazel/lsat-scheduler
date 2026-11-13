import { flushSync } from "react-dom";
import { durationMs, fadeIn, fadeOut, motionToken, reducedMotion, riseFrom, slideFrom, stopAtCurrentFrame } from "@/lib/motion";

type Mover = "leave" | "arrival" | "swap" | "dim";
const movers = new Map<HTMLElement, Mover>();

export function hold(el: HTMLElement, mover: Mover) {
  movers.set(el, mover);
  el.toggleAttribute("inert", mover !== "dim");
  el.setAttribute("aria-busy", "true");
}

export function letGo(el: HTMLElement) {
  movers.delete(el);
  el.removeAttribute("inert");
  el.removeAttribute("aria-busy");
}

export const heldBy = (mover: Mover) => [...movers].filter(([, by]) => by === mover).map(([el]) => el);
const held = (el: Element) => [...movers.keys()].some((part) => part.contains(el));

export type Still = { el: HTMLElement; frame: Keyframe };

export const motionOtherThanSwapsInside = (root: HTMLElement) =>
  [...movers].some(([part, by]) => (part.contains(root) || root.contains(part)) && (by !== "swap" || !root.contains(part)));

export function swapsInside(root: HTMLElement): Still[] {
  return [...movers].filter(([part]) => root.contains(part)).map(([el]) => {
    const { opacity, transform } = getComputedStyle(el);
    return { el, frame: { opacity, transform } };
  });
}

export function holdStill({ el, frame }: Still) {
  for (const animation of el.getAnimations()) animation.cancel();
  letGo(el);
  Object.assign(el.style, frame);
}

const PHONE_MAX_PX = 767;
const rise = () => (matchMedia(`(max-width: ${PHONE_MAX_PX}px)`).matches ? 4 : 8);
const STAGGER_MS = 40;

export type Motion = "whole-page" | "under-top-bar" | "swap";

export function regions(motion: Motion) {
  const found = [...document.querySelectorAll<HTMLElement>(motion === "swap" ? "[data-page-swap]" : "[data-page-fade], [data-page-swap]")]
    .filter((el) => el.getClientRects().length && !el.closest("[data-page-copy]") && (motion !== "under-top-bar" || !el.closest("header")));
  return found.filter((el) => !found.some((outer) => outer !== el && outer.contains(el)));
}

export function showAgain(el: HTMLElement, from: Keyframe) {
  letGo(el);
  return fadeIn(el, from);
}

export const riseIn = (el: HTMLElement) => showAgain(el, el.dataset.pageFade === "in-place" ? { opacity: 0 } : riseFrom(rise()));

export function fadeAway(old: HTMLElement[], mover: "leave" | "swap") {
  if (old.some((el) => el.contains(document.activeElement))) document.querySelector("main")?.focus({ preventScroll: true });
  for (const el of old) hold(el, mover);
  const exits = reducedMotion() ? [] : old.map((el) => fadeOut(el, { shorten: true }));
  return Promise.all(exits.map((exit) => exit.finished)).then(() => true, () => false);
}

export function arrive(motion: Motion) {
  document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  for (const el of regions(motion)) riseIn(el);
}

export function fadeFormThrough(update: () => void) {
  const old = regions("swap");
  if (!old.length || old.some(held) || !("animate" in Element.prototype)) return update();
  fadeAway(old, "swap").then((ok) => {
    if (!ok) return;
    for (const el of old) {
      for (const animation of el.getAnimations()) animation.cancel();
      letGo(el);
    }
    flushSync(update);
    arrive("swap");
  });
}

export function slideStep(el: HTMLElement, x: number, update: () => void, enter: Keyframe = slideFrom(x)) {
  if (!("animate" in Element.prototype)) return update();
  const show = () => {
    for (const animation of el.getAnimations()) animation.cancel();
    letGo(el);
    flushSync(update);
    fadeIn(el, enter);
  };
  if (reducedMotion()) return show();
  if (el.contains(document.activeElement)) document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  hold(el, "swap");
  fadeOut(el, { x, shorten: true }).finished.then(() => el.isConnected && show(), () => {});
}

let slidOut: { el: HTMLElement; x: number } | null = null;

export function slideOutForServer(el: HTMLElement, x: number) {
  slidOut = { el, x };
  hold(el, "leave");
  if ("animate" in Element.prototype && !reducedMotion()) fadeOut(el, { x, shorten: true });
}

export function slideInFromServer(el: HTMLElement) {
  if (!slidOut || slidOut.el.isConnected) return;
  const { el: old, x } = slidOut;
  slidOut = null;
  letGo(old);
  if ("animate" in Element.prototype) fadeIn(el, slideFrom(x));
}

export function stayAfterServer(el: HTMLElement) {
  if (slidOut?.el !== el) return;
  slidOut = null;
  if ("animate" in Element.prototype) showAgain(el, stopAtCurrentFrame(el));
  else letGo(el);
}

export function dim(el: HTMLElement, options: { to: number; x?: number }) {
  hold(el, "dim");
  return fadeOut(el, options);
}

/** `fade` is a tab change: the content fades in place, because a student switches tabs many times a day. */
export function arriveSections(page: Element, look: "rise" | "fade" = "rise") {
  const sections = [...page.querySelectorAll<HTMLElement>("[data-page-section]")].filter((section) => !held(section));
  if (look === "fade") {
    return sections.map((section) => section.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durationMs("--duration-fast"), easing: "ease-out", fill: "backwards" }));
  }
  const still = reducedMotion();
  const y = rise();
  return sections.map((section, index) => section.animate(
    still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: "none" }],
    {
      duration: durationMs(still ? "--duration-fast" : "--duration-base"),
      easing: motionToken("--ease-standard"),
      delay: still ? 0 : index * STAGGER_MS,
      fill: "backwards",
    },
  ));
}

export function handOff(dimmed: HTMLElement, page: Element) {
  for (const animation of dimmed.getAnimations()) animation.cancel();
  letGo(dimmed);
  arriveSections(page);
}
