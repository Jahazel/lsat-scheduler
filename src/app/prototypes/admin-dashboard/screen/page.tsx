import { notFound } from "next/navigation";
import "../proto.css";
import { readView } from "../view";
import { StillMotion } from "./StillMotion";
import { Prototype } from "../parts/Prototype";
import { loadLiveSide } from "../parts/walk/load";

export default async function AdminDashboardScreen({ searchParams }: PageProps<"/prototypes/admin-dashboard/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const view = readView(await searchParams);
  const live = await loadLiveSide();
  return (
    <div data-proto-scene>
      <StillMotion on={view.reducedMotion} />
      <Prototype key={JSON.stringify(view)} view={view} live={live} />
    </div>
  );
}
