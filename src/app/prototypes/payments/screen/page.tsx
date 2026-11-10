import { notFound } from "next/navigation";
import Stage from "./Stage";

export default async function PrototypeScreen({ searchParams }: PageProps<"/prototypes/payments/screen">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return <Stage screen={one(params.screen) ?? ""} variant={Number(one(params.v)) || 1} reducedMotion={one(params.rm) === "1"} data={one(params.data) ?? "demo"} state={one(params.state) ?? ""} />;
}
