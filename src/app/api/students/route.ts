import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NOBODY, recordSecurityEvent } from "@/lib/securityLog";
import { listStudentsWithOwners } from "@/lib/studentRepository";

// Admin-only: the full roster across every student, for oversight.
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    await recordSecurityEvent({
      event: "student_data_refused", result: "refused", route: "/api/students",
      who: session?.user?.id ? { account: session.user.id } : NOBODY,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = await listStudentsWithOwners();

  return NextResponse.json(records);
}
