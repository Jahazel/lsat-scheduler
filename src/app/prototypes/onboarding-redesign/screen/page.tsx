import { notFound } from "next/navigation";
import "../proto.css";
import { readView } from "../view";
import { StillMotion } from "./StillMotion";
import { TodayOnboarding } from "./TodayOnboarding";
import { Site } from "../parts/site";

export default async function OnboardingRedesignScreen({ searchParams }: PageProps<"/prototypes/onboarding-redesign/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const view = readView(await searchParams);
  return (
    <div data-proto-scene>
      <StillMotion on={view.reducedMotion} />
      {view.scene === "today" && <TodayOnboarding />}
      {view.scene === "prototype" && <Site view={view} />}
    </div>
  );
}
