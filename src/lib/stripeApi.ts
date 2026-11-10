export const STRIPE_API_VERSION = "2025-03-31.basil";

export class StripeRequestFailed extends Error {
  override name = "StripeRequestFailed";
}

export function stripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set.");
  return secretKey;
}

type StripeRequest = { secretKey: string; form?: URLSearchParams; idempotencyKey?: string };

export async function stripeRequest(path: string, { secretKey, form, idempotencyKey }: StripeRequest): Promise<unknown> {
  const headers: Record<string, string> = { authorization: `Bearer ${secretKey}`, "stripe-version": STRIPE_API_VERSION };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: form ? "POST" : "GET",
    headers,
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new StripeRequestFailed(`Stripe answered ${response.status}`);
  return response.json();
}
