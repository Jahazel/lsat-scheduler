import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentModel } from "@/models/Student";
import type { StudentRecord } from "@/lib/types";

export async function GET() {
  await connectDB();
  const students = await StudentModel.find().sort({ name: 1 }).lean();

  const records: StudentRecord[] = students.map((s) => ({
    id: String(s._id),
    name: s.name,
    platform: s.platform,
    currentScore: s.currentScore,
    weekdayHours: s.weekdayHours,
    weekendHours: s.weekendHours,
    accommodationMultiplier: s.accommodationMultiplier,
  }));

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();

  const student = await StudentModel.create({
    name: body.name,
    platform: body.platform,
    currentScore: body.currentScore,
    weekdayHours: body.weekdayHours,
    weekendHours: body.weekendHours,
    accommodationMultiplier: body.accommodationMultiplier,
  });

  return NextResponse.json({ id: String(student._id) }, { status: 201 });
}
