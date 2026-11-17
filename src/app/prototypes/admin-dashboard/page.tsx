import { notFound } from "next/navigation";
import "./proto.css";
import Frame from "./Frame";
import { readView } from "./view";

export default async function AdminDashboardPrototype({ searchParams }: PageProps<"/prototypes/admin-dashboard">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <div data-proto-scene><Frame initial={readView(await searchParams)} /></div>;
}
