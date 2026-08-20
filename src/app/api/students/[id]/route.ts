import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import type { StudentRecord } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const student = await StudentModel.findById(id).lean();
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const record: StudentRecord = {
    id: String(student._id),
    name: student.name,
    platform: student.platform,
    weekdayHours: student.weekdayHours,
    weekendHours: student.weekendHours,
    accommodationMultiplier: student.accommodationMultiplier,
  };

  return NextResponse.json(record);
}
