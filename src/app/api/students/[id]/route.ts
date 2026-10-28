import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NOBODY, recordSecurityEvent } from "@/lib/securityLog";
import { findStudentWithOwner } from "@/lib/studentRepository";

// Admin-only: view one student's profile (their dashboard is rendered by
// the /admin/students/[id] page using this data plus their AnalyticsSnapshot).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    await recordSecurityEvent({
      event: "student_data_refused", result: "refused", route: "/api/students/[id]",
      who: session?.user?.id ? { account: session.user.id } : NOBODY,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const record = await findStudentWithOwner(id);
  if (!record) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
