import { isAdminUser } from "@/lib/accessControl";
import { auth } from "@/auth";
import { connectDB } from "./db";
import { UserModel } from "@/models/User";

export async function requireCurrentAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdminUser(session.user))
    throw new Error("Admin access required.");
  await connectDB();
  const user = await UserModel.findById(session.user.id).lean();
  if (!isAdminUser(user)) throw new Error("Admin access required.");
  return session.user.id;
}
