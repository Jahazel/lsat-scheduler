export type Email = { to: string; subject: string; text: string };
export type SendResult = { sent: true } | { sent: false };

const LOCAL_SITE_URL = "http://localhost:3000";
const RESEND_TIMEOUT_MS = 10_000;
const fakeOutbox: Email[] = [];

/** Sends one plain-text email. Never throws: a failure is logged and returned. */
export async function sendEmail(email: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) return sendWithResend(email, key, from);
  if (process.env.VERCEL) {
    console.error("Email not sent: this place has no RESEND_API_KEY or EMAIL_FROM.");
    return { sent: false };
  }
  fakeOutbox.push({ ...email });
  console.info(`Fake email to ${email.to}\nSubject: ${email.subject}\n\n${email.text}`);
  return { sent: true };
}

async function sendWithResend({ to, subject, text }: Email, key: string, from: string): Promise<SendResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (response.ok) return { sent: true };
    const refusal = await response.json().then((body: { name?: unknown }) => body.name, () => undefined);
    console.error(`Email not sent: Resend refused it with status ${response.status} (${String(refusal ?? "no reason")}).`);
  } catch (error) {
    console.error(`Email not sent: Resend could not be reached (${error instanceof Error ? error.name : "unknown error"}).`);
  }
  return { sent: false };
}

/** The fake sender's emails, oldest first. */
export function fakeEmails(): readonly Email[] {
  return [...fakeOutbox];
}

export function clearFakeEmails() {
  fakeOutbox.length = 0;
}

/** Builds an email link on the place's configured site address, never on the address a request names. */
export function emailLink(path: `/${string}`, params: Record<string, string>) {
  const site = process.env.SITE_URL || (process.env.VERCEL ? undefined : LOCAL_SITE_URL);
  if (!site) throw new Error("SITE_URL is not set, so this place cannot build email links.");
  const url = new URL(site);
  url.pathname = path;
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}
