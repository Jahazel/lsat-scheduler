import { connectDB } from "./db";
import { UserModel } from "@/models/User";
import {
  resolveStudentClock,
  resolveStudentTime,
  type AdminClockRepository,
} from "./adminTestWorkspace";

export const mongooseAdminClock: AdminClockRepository = {
  async findUser(userId) {
    await connectDB();
    return UserModel.findById(userId).lean();
  },
  async moveDate(userId, expected, next) {
    const result = await UserModel.updateOne(
      { _id: userId, role: "admin", simulatedDate: expected },
      { $set: { simulatedDate: next } },
      { runValidators: true },
    );
    return result.modifiedCount === 1;
  },
};

export function studentSideNow(
  user: { id?: string; role?: string },
  real = new Date(),
) {
  return resolveStudentTime(user, real, mongooseAdminClock);
}

export function studentSideClock(
  user: { id?: string; role?: string },
  real = new Date(),
) {
  return resolveStudentClock(user, real, mongooseAdminClock);
}
