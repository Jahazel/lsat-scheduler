import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { listStudentsWithOwners } from "@/lib/students";

// Admin-only: the full roster across every student, for oversight.
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const records = await listStudentsWithOwners();

  return NextResponse.json(records);
}
