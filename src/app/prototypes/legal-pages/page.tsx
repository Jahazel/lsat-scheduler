import { notFound } from "next/navigation";
import Frame, { type FrameSize } from "./Frame";
import { isAuthState, isDatasetName, isPageId } from "./pages";

export default async function LegalPagesPrototype({ searchParams }: PageProps<"/prototypes/legal-pages">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const size = one(params.size);
  const page = one(params.page);
  const data = one(params.data);
  const auth = one(params.auth);
  return (
    <Frame
      initial={{
        size: size === "tablet" || size === "mobile" ? (size as FrameSize) : "desktop",
        reducedMotion: one(params.rm) === "1",
        page: isPageId(page) ? page : "terms",
        data: isDatasetName(data) ? data : "demo",
        auth: isAuthState(auth) ? auth : "out",
        at: one(params.at) || null,
      }}
    />
  );
}
