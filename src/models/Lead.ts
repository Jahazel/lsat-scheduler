import mongoose, { Schema } from "mongoose";

export interface LeadDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  email: string;
}

const LeadSchema = new Schema<LeadDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export const LeadModel =
  (mongoose.models.Lead as mongoose.Model<LeadDocument>) ||
  mongoose.model<LeadDocument>("Lead", LeadSchema);
