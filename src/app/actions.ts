"use server";

import { z } from "zod";
import { countAction } from "@/lib/actionLimits";
import { clientIpAddress } from "@/lib/clientIpAddress";
import { getPostgresDatabase } from "@/lib/postgres";
import { leads } from "@/lib/postgresSchema";
import { SCHEDULE_TIMEZONE } from "@/lib/scheduleTimezone";

const CENTRAL_TIME = new Intl.DateTimeFormat("en-US", { timeZone: SCHEDULE_TIMEZONE, hour: "numeric", minute: "2-digit" });
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
  const limit = await countAction("leadCapture", await clientIpAddress(), new Date());
  if (!limit.allowed) {
    return { error: `Too many tries from this network. Try again after ${CENTRAL_TIME.format(limit.windowEnd)} Central time.` };
  }

  await getPostgresDatabase().insert(leads)
    .values({ email: validated.data.toLowerCase() })
    .onConflictDoNothing({ target: leads.email });

  return { success: true };
}
