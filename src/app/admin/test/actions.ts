"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { postgresAdminTestRepositories as repositories } from "@/lib/adminTestRepositories";
import { moveSimulatedDate, resetTestWorkspace } from "@/lib/adminTestWorkspace";
import { answerAction } from "@/lib/securityLog";

export async function setSimulatedDate(date: string) {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    await moveSimulatedDate(
      userId,
      z.string().parse(date),
      new Date(),
      repositories.clock,
    );
    revalidatePath("/", "layout");
  });
}

export async function resetEverything() {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    await resetTestWorkspace(userId, repositories);
    revalidatePath("/", "layout");
  });
}
