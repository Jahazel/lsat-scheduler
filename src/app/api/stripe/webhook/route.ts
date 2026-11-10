import { NextRequest, NextResponse } from "next/server";
import { ipAddressFrom } from "@/lib/clientIpAddress";
import { answerRequest, recordSecurityEvent } from "@/lib/securityLog";
import { receiveStripeMessage, STRIPE_MESSAGE_ROUTE } from "@/lib/stripeMessages";

export async function POST(request: NextRequest) {
  return answerRequest(STRIPE_MESSAGE_ROUTE, async () => {
    const body = Buffer.from(await request.arrayBuffer());
    const outcome = await receiveStripeMessage(body, request.headers.get("stripe-signature"), new Date());
    if (outcome.kind !== "refused") return NextResponse.json({ received: true });
    await recordSecurityEvent({
      event: "stripe_message_refused", result: outcome.result, route: STRIPE_MESSAGE_ROUTE, who: outcome.who,
      ipAddress: ipAddressFrom(request.headers),
    });
    return outcome.result === "badSignature"
      ? NextResponse.json({ error: "Bad signature" }, { status: 400 })
      : NextResponse.json({ received: true });
  });
}
