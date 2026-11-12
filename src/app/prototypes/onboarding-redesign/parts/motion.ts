import { flushSync } from "react-dom";
import { fadeIn, fadeOut, reducedMotion, slideFrom } from "@/lib/motion";
import { arriveSections, hold, letGo } from "@/lib/pageMotion";

// The same 8 px as a step change (STEP_SLIDE in OnboardingWizard), so every forward move in onboarding reads alike.
const FORWARD_PX = 8;

function settle(el: HTMLElement) {
  for (const animation of el.getAnimations()) animation.cancel();
  letGo(el);
}

function leaveThen(el: HTMLElement | null, x: number, show: () => void) {
  if (!el || !("animate" in Element.prototype) || reducedMotion()) return show();
  hold(el, "swap");
  fadeOut(el, { x, shorten: true }).finished.then(() => el.isConnected && show(), () => {});
}

/** Another page: the old page fades out, then the new page's sections rise in one after another (today's whole-page arrival). */
export function changePage(el: HTMLElement | null, update: () => void) {
  leaveThen(el, 0, () => {
    if (el) settle(el);
    flushSync(update);
    if (el) arriveSections(el);
  });
}

/**
 * The next screen inside onboarding: the area under the top bar slides forward like a step.
 * "fade" is for the Week reveal, whose own parts rise in a wave, so the area itself only fades in.
 */
export function nextScreen(el: HTMLElement | null, enter: "slide" | "fade", update: () => void) {
  leaveThen(el, FORWARD_PX, () => {
    if (el) settle(el);
    flushSync(update);
    if (el) fadeIn(el, enter === "slide" ? slideFrom(FORWARD_PX) : { opacity: 0 });
  });
}
