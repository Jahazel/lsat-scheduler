"use server";

import { z } from "zod";
import { getPostgresDatabase } from "@/lib/postgres";
import { leads } from "@/lib/postgresSchema";

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

  await getPostgresDatabase().insert(leads)
    .values({ email: validated.data.toLowerCase() })
    .onConflictDoNothing({ target: leads.email });

  return { success: true };
}
