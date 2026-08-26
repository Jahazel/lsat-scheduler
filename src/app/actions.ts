"use server";

import { z } from "zod";
import { connectDB } from "@/lib/db";
import { LeadModel } from "@/models/Lead";

const EmailSchema = z.email({ error: "Enter a valid email." });

export interface CaptureLeadState {
  success?: boolean;
  error?: string;
}

// Not-ready-to-buy visitors from the landing page's email capture — no
// account, just an address to follow up with.
export async function captureLead(_state: CaptureLeadState, formData: FormData): Promise<CaptureLeadState> {
  const validated = EmailSchema.safeParse(formData.get("email"));
  if (!validated.success) {
    return { error: "Enter a valid email." };
  }

  await connectDB();
  await LeadModel.create({ email: validated.data.toLowerCase() });

  return { success: true };
}
