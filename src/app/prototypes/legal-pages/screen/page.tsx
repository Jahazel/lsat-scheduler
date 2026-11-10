import { notFound } from "next/navigation";
import Stage from "./Stage";
import { isAuthState, isDatasetName, isPageId } from "../pages";

export default async function LegalPagesScreen({ searchParams }: PageProps<"/prototypes/legal-pages/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const page = one(params.page);
  return <Stage page={isPageId(page) ? page : "terms"} variant={Number(one(params.v)) || 1} reducedMotion={one(params.rm) === "1"} data={isDatasetName(one(params.data)) ? (one(params.data) as "demo" | "worst") : "demo"} auth={isAuthState(one(params.auth)) ? (one(params.auth) as "out" | "in") : "out"} section={one(params.at)} />;
}
