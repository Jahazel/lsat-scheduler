"use client";

import { useActionState } from "react";
import { captureLead, type CaptureLeadState } from "./actions";

const initialState: CaptureLeadState = {};

export default function EmailCaptureForm() {
  const [state, formAction, pending] = useActionState(captureLead, initialState);

  if (state.success) {
    return <p className="text-sm text-ink-600">Thanks — we&rsquo;ll be in touch.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-100 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Notify me"}
      </button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
    </form>
  );
}
