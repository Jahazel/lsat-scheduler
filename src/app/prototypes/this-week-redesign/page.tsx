import { notFound } from "next/navigation";
import Frame from "./Frame";
import { readView } from "./view";

export default async function ThisWeekRedesignPrototype({ searchParams }: PageProps<"/prototypes/this-week-redesign">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Frame initial={readView(await searchParams)} />;
}
