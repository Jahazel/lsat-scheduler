"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentAdmin } from "@/lib/requireAdmin";
import { postgresAdminTestRepositories as repositories } from "@/lib/adminTestRepositories";
import {
  generateTestAnalytics,
  moveSimulatedDate,
  rebuildTestWeek,
  resetTestWorkspace,
  samplePracticeTestSections,
} from "@/lib/adminTestWorkspace";
import type { SampleDirection } from "@/lib/sampleAnalytics";
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

export async function generateTestSample(direction: SampleDirection) {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    const rows = await generateTestAnalytics(
      userId,
      z.enum(["improving", "steady", "slipping"]).parse(direction),
      repositories,
    );
    return { rows, sections: samplePracticeTestSections(), extractedAt: new Date().toISOString() };
  });
}

export async function rebuildThisWeek() {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    await rebuildTestWeek(userId, new Date(), repositories);
    revalidatePath("/", "layout");
  });
}

export async function resetTestData() {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    await resetTestWorkspace(userId, "test-data", repositories);
    revalidatePath("/", "layout");
  });
}

export async function resetEverything() {
  return answerAction("/admin/test", async () => {
    const userId = await requireCurrentAdmin("/admin/test");
    await resetTestWorkspace(userId, "everything", repositories);
    revalidatePath("/", "layout");
  });
}
