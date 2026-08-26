"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, signInWithGoogle, type SignupState } from "./actions";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Create your account</h1>
        <p className="mt-1 text-sm text-ink-500">Start with your intake, and DrillMap builds your first week.</p>

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
            <span className="text-sm font-medium text-ink-700">Name</span>
            <input
              type="text"
              name="name"
              required
              className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"
            />
            {state.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"
            />
            {state.errors?.email && <p className="text-sm text-red-600">{state.errors.email[0]}</p>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Password</span>
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"
            />
            {state.errors?.password && (
              <ul className="text-sm text-red-600">
                {state.errors.password.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </label>

          <label className="flex items-start gap-2 text-sm text-ink-600">
            <input type="checkbox" name="agreedToTerms" required className="mt-0.5" />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms" className="underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {state.message && <p className="text-sm text-red-600">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent-700 disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-600 hover:text-accent-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
