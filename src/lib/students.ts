import type mongoose from "mongoose";
import { StudentModel } from "@/models/Student";
// Imported for its side effect of registering the "User" model — required
// for the populate("userId") calls below to resolve.
import "@/models/User";
import type { DayOfWeek, StudentRecord } from "@/lib/types";

interface PopulatedOwner {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: "student" | "admin";
}

function toStudentRecord(doc: {
  _id: mongoose.Types.ObjectId;
  userId: PopulatedOwner;
  platform: StudentRecord["platform"];
  currentScore: number;
  goalScore: number;
  dailyCapacityMinutes: Record<DayOfWeek, number>;
  preferredPracticeTestDay: DayOfWeek;
  accommodationMultiplier: StudentRecord["accommodationMultiplier"];
  goalTestDate: string;
}): StudentRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId._id),
    name: doc.userId.name,
    email: doc.userId.email,
    platform: doc.platform,
    currentScore: doc.currentScore,
    goalScore: doc.goalScore,
    dailyCapacityMinutes: doc.dailyCapacityMinutes,
    preferredPracticeTestDay: doc.preferredPracticeTestDay,
    accommodationMultiplier: doc.accommodationMultiplier,
    goalTestDate: doc.goalTestDate,
  };
}

// Admin-only: real students with their owning User's name/email resolved,
// sorted by name. Pre-migration Student rows that predate the userId field
// (orphaned test data) are silently dropped — they have no owner to show.
export async function listStudentsWithOwners(): Promise<StudentRecord[]> {
  const students = await StudentModel.find().populate<{ userId: PopulatedOwner }>("userId", "name email role").lean();

  return students
    .filter((s) => s.userId && s.userId.role !== "admin")
    .map(toStudentRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Admin-only: one student by id, with their owning User's name/email
// resolved. Admin-owned Students, missing ids and orphaned rows return null.
export async function getStudentWithOwner(id: string): Promise<StudentRecord | null> {
  const doc = await StudentModel.findById(id).populate<{ userId: PopulatedOwner }>("userId", "name email role").lean();
  if (!doc || !doc.userId || doc.userId.role === "admin") return null;

  return toStudentRecord(doc);
}
