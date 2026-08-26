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
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Log in</h1>

        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors duration-150 ease-out hover:bg-ink-100"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-400">
          <div className="h-px flex-1 bg-ink-100" />
          or
          <div className="h-px flex-1 bg-ink-100" />
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Password</span>
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"
            />
          </label>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 disabled:opacity-50"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          New to DrillMap?{" "}
          <Link href="/signup" className="font-medium text-accent-600 hover:text-accent-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
