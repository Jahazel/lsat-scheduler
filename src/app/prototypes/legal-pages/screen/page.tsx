import { notFound } from "next/navigation";
import Stage from "./Stage";
import { isAuthState, isDatasetName, isPageId } from "../pages";

export default async function LegalPagesScreen({ searchParams }: PageProps<"/prototypes/legal-pages/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const page = one(params.page);
  const data = one(params.data);
  const auth = one(params.auth);
  return <Stage page={isPageId(page) ? page : "terms"} reducedMotion={one(params.rm) === "1"} data={isDatasetName(data) ? data : "demo"} auth={isAuthState(auth) ? auth : "out"} section={one(params.at)} />;
}
