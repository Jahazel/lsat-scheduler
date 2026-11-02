/**
 * Resolves when every animation and transition running on `element` ends or is cancelled.
 * Call it after the exit state is on the element, so the CSS owns how long the exit lasts.
 * Resolves at once when nothing runs, as in browsers without the Web Animations API and in jsdom.
 */
export async function afterExit(element: Element): Promise<void> {
  if (!("getAnimations" in element)) return;
  await Promise.allSettled(element.getAnimations().map((exit) => exit.finished));
}
