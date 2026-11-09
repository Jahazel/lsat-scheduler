import { notFound } from "next/navigation";
import Frame, { type FrameSize } from "./Frame";
import { isDatasetName, type DatasetName } from "./protoData";

export default async function PaymentsPrototype({ searchParams }: PageProps<"/prototypes/payments">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const size = one(params.size);
  return (
    <Frame
      initial={{
        size: size === "tablet" || size === "mobile" ? (size as FrameSize) : "desktop",
        reducedMotion: one(params.rm) === "1",
        screen: one(params.screen) ?? "",
        variant: Number(one(params.v)) || 1,
        data: isDatasetName(one(params.data)) ? (one(params.data) as DatasetName) : "demo",
      }}
    />
  );
}
