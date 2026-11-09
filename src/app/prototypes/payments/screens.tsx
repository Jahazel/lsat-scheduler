import type { ComponentType } from "react";
import PlanChoice from "./sections/PlanChoice";
import NoticeCard from "./sections/notes/NoticeCard";
import FactRows from "./sections/plan-card/FactRows";
import { PLAN_CARD_STATES, WEEK_STATES } from "./protoData";

export type ProtoScreen = {
  id: string;
  label: string;
  variants: { name: string; Component: ComponentType }[];
  states?: { id: string; label: string }[];
};

export const SCREENS: ProtoScreen[] = [
  { id: "plan-choice", label: "1 · Plan choice", variants: [{ name: "Cards + Stripe", Component: PlanChoice }] },
  {
    id: "this-week",
    label: "2 · This week notes",
    variants: [{ name: "Notice card", Component: NoticeCard }],
    states: WEEK_STATES,
  },
  {
    id: "plan-card",
    label: "3 · Account Plan card",
    variants: [{ name: "Fact rows", Component: FactRows }],
    states: PLAN_CARD_STATES,
  },
];

export const findScreen = (id: string | undefined) => SCREENS.find((screen) => screen.id === id) ?? SCREENS[0];

export const findState = (screen: ProtoScreen, id: string | undefined) =>
  screen.states?.find((state) => state.id === id)?.id ?? screen.states?.[0]?.id ?? "";
