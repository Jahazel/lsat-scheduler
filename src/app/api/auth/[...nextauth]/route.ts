import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { recordGoogleCallbackFailure } from "@/lib/authAccounts";

export const { POST } = handlers;

export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);
  await recordGoogleCallbackFailure(request.nextUrl, response);
  return response;
}
