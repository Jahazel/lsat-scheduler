import { notFound } from "next/navigation";
import Frame, { type FrameSize } from "./Frame";
import { isAuthState, isDatasetName, isPageId } from "./pages";

export default async function LegalPagesPrototype({ searchParams }: PageProps<"/prototypes/legal-pages">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const size = one(params.size);
  const page = one(params.page);
  return (
    <Frame
      initial={{
        size: size === "tablet" || size === "mobile" ? (size as FrameSize) : "desktop",
        reducedMotion: one(params.rm) === "1",
        page: isPageId(page) ? page : "terms",
        variant: Number(one(params.v)) || 1,
        data: isDatasetName(one(params.data)) ? (one(params.data) as "demo" | "worst") : "demo",
        auth: isAuthState(one(params.auth)) ? (one(params.auth) as "out" | "in") : "out",
        at: one(params.at) || null,
      }}
    />
  );
}
