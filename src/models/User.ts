import mongoose, { Schema } from "mongoose";

export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  // Absent for accounts created via Google sign-in.
  passwordHash?: string;
  role: "student" | "admin";
}

const UserSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String },
  role: { type: String, enum: ["student", "admin"], required: true, default: "student" },
});

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", UserSchema);
