import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AnalyticsSnapshotModel } from "@/models/AnalyticsSnapshot";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const body = await request.json();

  await AnalyticsSnapshotModel.findOneAndUpdate(
    { studentId: id },
    {
      studentId: id,
      weekOf: new Date().toISOString().slice(0, 10),
      lrAccuracyByType: body.lrAccuracyByType,
      lrTopPriorityLogicTypes: body.lrTopPriorityLogicTypes,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
