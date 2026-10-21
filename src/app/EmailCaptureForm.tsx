"use client";

import { useActionState } from "react";
import { captureLead, type CaptureLeadState } from "./actions";

const initialState: CaptureLeadState = {};

export default function EmailCaptureForm() {
  const [state, formAction, pending] = useActionState(captureLead, initialState);

  if (state.success) {
    return <p className="text-small text-smoke">Thanks — we&rsquo;ll be in touch.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="flex-1 rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm border border-vellum-line px-4 py-2 text-small font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum-line disabled:opacity-50"
      >
        {pending ? "Saving…" : "Notify me"}
      </button>
      {state.error && <p className="text-small text-danger-ink sm:col-span-2">{state.error}</p>}
    </form>
  );
}
