globalThis.fetch = async (input) => {
  if (new URL(String(input)).origin !== "https://api.stripe.com") throw new Error("Not a Stripe request");
  return Response.json({ error: { type: "invalid_request_error" } }, { status: 401 });
};
