import { flushSync } from "react-dom";
import { durationMs, fadeIn, fadeOut, motionToken, reducedMotion, riseFrom, slideFrom } from "@/lib/motion";

// The one place that knows which motion holds each part of the page. A held part is inert and busy for assistive tech.
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
export const motionInside = (root: HTMLElement) => [...movers.keys()].some((part) => part.contains(root) || root.contains(part));

// The two rises switch to the phone distance at different widths; merging them needs a product answer.
const regionRise = () => (matchMedia("(max-width: 390px)").matches ? 4 : 8);
const sectionRise = () => (matchMedia("(max-width: 767px)").matches ? 4 : 8);
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

export const riseIn = (el: HTMLElement) => showAgain(el, riseFrom(regionRise()));

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

export function slideStep(el: HTMLElement, x: number, update: () => void) {
  if (!("animate" in Element.prototype)) return update();
  const show = () => {
    for (const animation of el.getAnimations()) animation.cancel();
    letGo(el);
    flushSync(update);
    fadeIn(el, slideFrom(x));
  };
  if (reducedMotion()) return show();
  if (el.contains(document.activeElement)) document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  hold(el, "swap");
  fadeOut(el, { x, shorten: true }).finished.then(() => el.isConnected && show(), () => {});
}

export function dim(el: HTMLElement, options: { to: number; x?: number }) {
  hold(el, "dim");
  return fadeOut(el, options);
}

export function arriveSections(page: Element) {
  const sections = [...page.querySelectorAll<HTMLElement>("[data-page-section]")].filter((section) => !held(section));
  const still = reducedMotion();
  const rise = sectionRise();
  return sections.map((section, index) => section.animate(
    still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(${rise}px)` }, { opacity: 1, transform: "none" }],
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
