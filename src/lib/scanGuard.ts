import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { freeScanPlace, takeScanPlace } from "./scanPlaces";

/** Runs one paid screenshot read for a signed-in Account after its file passed its checks. A refusal starts no read. */
export async function scanWithLimits(accountId: string, read: () => Promise<object>): Promise<NextResponse> {
  const realNow = new Date();
  const place = await takeScanPlace(accountId, realNow);
  if ("refused" in place) {
    const retryAfter = Math.max(1, Math.ceil((place.retryAt.getTime() - realNow.getTime()) / 1000));
    return NextResponse.json(
      { error: place.message, reason: place.refused },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    return NextResponse.json(await read());
  } catch (error) {
    return error instanceof Anthropic.APIConnectionTimeoutError
      ? NextResponse.json({ error: "Reading took too long and stopped. Try again." }, { status: 504 })
      : NextResponse.json({ error: "Couldn't read that screenshot" }, { status: 502 });
  } finally {
    await freeScanPlace(place).catch((error: unknown) => {
      console.error(JSON.stringify({ event: "scan_place_not_freed", error: error instanceof Error ? error.name : "unknown" }));
    });
  }
}
