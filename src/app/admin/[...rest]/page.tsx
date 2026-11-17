import { notFound } from "next/navigation";
import { requireAdmin } from "../requireAdmin";

export default async function UnknownAdminPage() {
  await requireAdmin();
  notFound();
}
