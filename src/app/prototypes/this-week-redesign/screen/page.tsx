import { notFound } from "next/navigation";
import "../proto.css";
import { readView } from "../view";
import { StillMotion } from "./StillMotion";
import { Prototype } from "../parts/Prototype";

export default async function ThisWeekRedesignScreen({ searchParams }: PageProps<"/prototypes/this-week-redesign/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const view = readView(await searchParams);
  return (
    <div data-proto-scene>
      <StillMotion on={view.reducedMotion} />
      <Prototype key={JSON.stringify(view)} view={view} />
    </div>
  );
}
