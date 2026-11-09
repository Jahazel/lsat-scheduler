import type { ComponentType } from "react";
import PlanChoiceCards from "./variants/planChoiceCards";
import PlanChoiceReceipt from "./variants/planChoiceReceipt";
import PlanChoiceTimeline from "./variants/planChoiceTimeline";

export type ProtoScreen = { id: string; label: string; variants: { name: string; Component: ComponentType }[] };

export const SCREENS: ProtoScreen[] = [
  {
    id: "plan-choice",
    label: "1 · Plan choice",
    variants: [
      { name: "Cards + calendar", Component: PlanChoiceCards },
      { name: "Receipt", Component: PlanChoiceReceipt },
      { name: "Timeline", Component: PlanChoiceTimeline },
    ],
  },
];

export const findScreen = (id: string | undefined) => SCREENS.find((screen) => screen.id === id) ?? SCREENS[0];
