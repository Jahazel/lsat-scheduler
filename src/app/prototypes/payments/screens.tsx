import type { ComponentType } from "react";
import PlanChoice from "./sections/PlanChoice";

export type ProtoScreen = { id: string; label: string; variants: { name: string; Component: ComponentType }[] };

export const SCREENS: ProtoScreen[] = [
  { id: "plan-choice", label: "1 · Plan choice", variants: [{ name: "Cards + Stripe", Component: PlanChoice }] },
];

export const findScreen = (id: string | undefined) => SCREENS.find((screen) => screen.id === id) ?? SCREENS[0];
