import type { ComponentType } from "react";
import PlanChoice from "./sections/PlanChoice";
import NoticeCard from "./sections/notes/NoticeCard";
import FactRows from "./sections/plan-card/FactRows";
import Starting from "./sections/starting/Starting";
import RestartChoice from "./sections/restart/RestartChoice";
import ProgressNote from "./sections/progress/ProgressNote";
import DeletionWarning from "./sections/deletion/DeletionWarning";
import LandingWording from "./sections/landing/LandingWording";
import { DELETION_STATES, PLAN_CARD_STATES, PROGRESS_STATES, RESTART_STATES, STARTING_STATES, WEEK_STATES } from "./protoData";

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
  { id: "starting", label: "4 · Starting your plan", variants: [{ name: "Loop", Component: Starting }], states: STARTING_STATES },
  { id: "restart", label: "5 · Plan choice · lapsed", variants: [{ name: "Cards + Stripe", Component: RestartChoice }], states: RESTART_STATES },
  { id: "progress", label: "6 · Progress lapsed note", variants: [{ name: "Notice card", Component: ProgressNote }], states: PROGRESS_STATES },
  { id: "deletion", label: "7 · Deletion warning", variants: [{ name: "Warning box", Component: DeletionWarning }], states: DELETION_STATES },
  { id: "landing", label: "8 · Landing wording", variants: [{ name: "Wording", Component: LandingWording }] },
];

export const findScreen = (id: string | undefined) => SCREENS.find((screen) => screen.id === id) ?? SCREENS[0];

export const findState = (screen: ProtoScreen, id: string | undefined) =>
  screen.states?.find((state) => state.id === id)?.id ?? screen.states?.[0]?.id ?? "";
