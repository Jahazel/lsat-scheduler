import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { getStudentWithOwner } from "@/lib/students";

// Admin-only: view one student's profile (their dashboard is rendered by
// the /admin/students/[id] page using this data plus their AnalyticsSnapshot).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const record = await getStudentWithOwner(id);
  if (!record) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
