import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { MODEL_REPLY_REFUSED, type RecordCost } from "./claudeExtract";
import { freeScanPlace, takeScanPlace } from "./scanPlaces";
import { trySendSpendAlert, type ScanKind } from "./scanSpending";
import { recordSecurityEvent } from "./securityLog";

/** Anthropic refused our key, account, or model: a setup fault for the owner, not an unreadable screenshot. */
const SETUP_FAULT_STATUSES = [401, 403, 404];

const SCAN_ROUTES = { analytics: "/api/analytics/extract", "practice-test-section": "/api/practice-test/extract" } as const;

/** Runs one paid screenshot read for a signed-in Account after its file passed its checks. A refusal starts no read. */
export async function scanWithLimits(accountId: string, kind: ScanKind, read: (recordCost: RecordCost) => Promise<object>): Promise<NextResponse> {
  const realNow = new Date();
  const place = await takeScanPlace(accountId, kind, realNow);
  const alertSent = place.alert ? trySendSpendAlert(place.alert, realNow) : undefined;
  const entry = { route: SCAN_ROUTES[kind], who: { account: accountId } };
  if (place.alert === "limit-reached") await recordSecurityEvent({ ...entry, event: "budget_cutoff", result: "limitReached" });
  if ("refused" in place) {
    await recordSecurityEvent({ ...entry, event: "limit_refused", result: place.refused });
    await alertSent;
    const headers = place.retryAt
      ? { "Retry-After": String(Math.max(1, Math.ceil((place.retryAt.getTime() - realNow.getTime()) / 1000))) }
      : undefined;
    return NextResponse.json({ error: place.message, reason: place.refused }, { status: 429, headers });
  }

  let realCostUsd: number | null = null;
  try {
    return NextResponse.json(await read((usd) => { realCostUsd = usd; }));
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "Reading took too long and stopped. Try again." }, { status: 504 });
    }
    const unreadable = error instanceof Error && error.name === MODEL_REPLY_REFUSED;
    const serviceFault = error instanceof Anthropic.APIError && !SETUP_FAULT_STATUSES.includes(error.status ?? 0);
    if (unreadable || serviceFault) {
      return NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
    }
    throw error;
  } finally {
    await Promise.all([
      alertSent,
      freeScanPlace(place, realCostUsd).catch((error: unknown) => {
        console.error(JSON.stringify({ event: "scan_place_not_freed", error: error instanceof Error ? error.name : "unknown" }));
      }),
    ]);
  }
}
