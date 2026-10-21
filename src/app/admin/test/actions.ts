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

export async function setSimulatedDate(date: string) {
  const userId = await requireCurrentAdmin();
  await moveSimulatedDate(
    userId,
    z.string().parse(date),
    new Date(),
    repositories.clock,
  );
  revalidatePath("/", "layout");
}

export async function generateTestSample(direction: SampleDirection) {
  const userId = await requireCurrentAdmin();
  const rows = await generateTestAnalytics(
    userId,
    z.enum(["improving", "steady", "slipping"]).parse(direction),
    repositories,
  );
  return { rows, sections: samplePracticeTestSections(), extractedAt: new Date().toISOString() };
}

export async function rebuildThisWeek() {
  const userId = await requireCurrentAdmin();
  await rebuildTestWeek(userId, new Date(), repositories);
  revalidatePath("/", "layout");
}

export async function resetTestData() {
  const userId = await requireCurrentAdmin();
  await resetTestWorkspace(userId, "test-data", repositories);
  revalidatePath("/", "layout");
}

export async function resetEverything() {
  const userId = await requireCurrentAdmin();
  await resetTestWorkspace(userId, "everything", repositories);
  revalidatePath("/", "layout");
}
