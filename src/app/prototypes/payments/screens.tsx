import type { ComponentType } from "react";
import PlanChoice from "./sections/PlanChoice";
import TopStrip from "./sections/notes/TopStrip";
import HeaderPanel from "./sections/notes/HeaderPanel";
import NoticeCard from "./sections/notes/NoticeCard";
import { WEEK_STATES } from "./protoData";

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
    variants: [
      { name: "Top strip", Component: TopStrip },
      { name: "Header panel", Component: HeaderPanel },
      { name: "Notice card", Component: NoticeCard },
    ],
    states: WEEK_STATES,
  },
];

export const findScreen = (id: string | undefined) => SCREENS.find((screen) => screen.id === id) ?? SCREENS[0];

export const findState = (screen: ProtoScreen, id: string | undefined) =>
  screen.states?.find((state) => state.id === id)?.id ?? screen.states?.[0]?.id ?? "";
