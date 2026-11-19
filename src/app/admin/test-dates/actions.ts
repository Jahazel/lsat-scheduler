"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { answerAction } from "@/lib/securityLog";
import { addTestMonth, removeTestMonth } from "@/lib/testMonthRepository";
import { isTestMonth, parseTestMonthPick } from "@/lib/testMonths";
import type { Answer } from "@/lib/unexpectedFailure";

const ROUTE = "/admin/test-dates";

export type AddTestMonthAnswer = { added: string } | { listed: string } | { invalid: true } | null;
export type RemoveTestMonthAnswer = { picked: number } | null;

export async function addTestMonthFromForm(_previous: unknown, form: FormData): Promise<Answer<AddTestMonthAnswer>> {
  return answerAction(ROUTE, async () => {
    await requireCurrentAdmin(ROUTE);
    const month = parseTestMonthPick({ month: form.get("month"), year: form.get("year") });
    if (!month) return { invalid: true };
    if ((await addTestMonth(month)) === "already listed") return { listed: month };
    revalidatePath("/", "layout");
    return { added: month };
  });
}

export async function removeTestMonthFromForm(_previous: unknown, form: FormData): Promise<Answer<RemoveTestMonthAnswer>> {
  return answerAction(ROUTE, async () => {
    await requireCurrentAdmin(ROUTE);
    const month = form.get("month");
    if (!isTestMonth(month)) throw new Error("Remove needs a test month.");
    const { removed, students } = await removeTestMonth(month);
    if (!removed && students > 0) return { picked: students };
    revalidatePath("/", "layout");
    return null;
  });
}
