const STRIPE_API_VERSION = "2025-03-31.basil";

class StripeRequestFailed extends Error {
  override name = "StripeRequestFailed";
}

export function stripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set.");
  return secretKey;
}

export async function stripeRequest(
  path: string,
  secretKey: string,
  form?: Record<string, string>,
  method: "GET" | "POST" | "DELETE" = form ? "POST" : "GET",
): Promise<unknown> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { authorization: `Bearer ${secretKey}`, "stripe-version": STRIPE_API_VERSION },
    body: form ? new URLSearchParams(form) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new StripeRequestFailed(`Stripe answered ${response.status}`);
  return response.json();
}
