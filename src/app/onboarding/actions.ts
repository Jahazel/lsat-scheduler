"use server";

import { dateInScheduleTimezone } from "@/lib/adminTestWorkspace";
import { studentSideClock } from "@/lib/studentClock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createStudent, findStudentByAccountId } from "@/lib/studentRepository";
import { SnapshotApprovalError, SnapshotSaveLimitReached, snapshotWeekOptions, prepareApprovedSnapshot, summarizeApprovedRows, type SnapshotApprovalMetadata } from "@/lib/analyticsSnapshots";
import { answerAction, recordSecurityEvent } from "@/lib/securityLog";
import { loadAccountPlan } from "@/lib/billingRepository";
import { isPlanName } from "@/lib/planChoice";
import { mayStartWeeklyUpload } from "@/lib/planStatus";
import { createCheckoutSession, planChoiceStanding } from "@/lib/stripeCheckout";
import { parseOfficialAttempts, parseStudentProfile, type OfficialAttempt, type StudentProfileInput } from "@/lib/studentProfile";
import type { AnalyticsExtractedRow } from "@/lib/types";
import type { Answer } from "@/lib/unexpectedFailure";

export async function createStudentProfile(
  input: StudentProfileInput & {
    officialAttempts: OfficialAttempt[];
    analyticsRows: AnalyticsExtractedRow[];
    analyticsApproval: SnapshotApprovalMetadata | null;
  }
): Promise<Answer<{ error: string } | void>> {
  return answerAction("/onboarding", async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    const { officialAttempts, analyticsRows, analyticsApproval, ...profile } = input;
    const clock = await studentSideClock(session.user);
    const today = dateInScheduleTimezone(clock.now);
    const studentFields = parseStudentProfile(profile, today);
    const attempts = parseOfficialAttempts(officialAttempts, today);

    const existing = await findStudentByAccountId(session.user.id);
    if (existing) {
      redirect("/dashboard");
    }

    let student;
    try {
      const approvedSnapshot =
        analyticsRows.length > 0 && analyticsApproval
          ? prepareApprovedSnapshot({ ...summarizeApprovedRows(analyticsRows), ...analyticsApproval }, clock.now, clock.real, snapshotWeekOptions(clock))
          : null;
      student = await createStudent(session.user.id, studentFields, {
        snapshot: approvedSnapshot && { values: approvedSnapshot, realNow: clock.real },
        officialAttempts: attempts,
      });
    } catch (error) {
      if (error instanceof SnapshotSaveLimitReached) {
        await recordSecurityEvent({ event: "limit_refused", result: "analyticsSnapshotSave", route: "/onboarding", who: { account: session.user.id } });
      }
      if (error instanceof SnapshotApprovalError) return { error: error.message };
      throw error;
    }
    if (!student) redirect("/dashboard");

    revalidatePath("/", "layout");
    redirect("/dashboard");
  });
}

export async function openStripeCheckout(plan: unknown): Promise<Answer<{ checkoutUrl: string }>> {
  return answerAction("/onboarding", async () => {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    if (!isPlanName(plan)) throw new Error("Unknown plan");
    if (!(await findStudentByAccountId(session.user.id))) redirect("/onboarding");
    const realNow = new Date();
    const standing = await planChoiceStanding(session.user.id, realNow);
    if (standing.kind !== "choose") redirect("/dashboard");
    return { checkoutUrl: await createCheckoutSession(session.user.id, standing, plan, realNow) };
  });
}

export async function hasPlanStarted(): Promise<Answer<boolean>> {
  return answerAction("/onboarding", async () => {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    return mayStartWeeklyUpload((await loadAccountPlan(session.user.id)).status);
  });
}
