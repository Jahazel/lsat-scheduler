"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signInWithGoogle, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="text-h3 font-semibold text-ink">Log in</h1>

        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-sm border border-vellum-line bg-paper px-4 py-2 text-small font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum-line"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-caption text-smoke">
          <div className="h-px flex-1 bg-vellum-line" />
          or
          <div className="h-px flex-1 bg-vellum-line" />
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-smoke">Password</span>
            <input
              type="password"
              name="password"
              required
              className="rounded-sm border border-vellum-line bg-paper px-3 py-2 text-small text-ink"
            />
          </label>

          {state.error && <p className="text-small text-danger-ink">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-ink px-4 py-2 text-small font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised disabled:opacity-50"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-small text-smoke">
          New to DrillMap?{" "}
          <Link href="/signup" className="font-medium text-accent hover:text-ink">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
