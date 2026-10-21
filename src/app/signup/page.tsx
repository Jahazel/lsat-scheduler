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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-smoke">Start with your intake, and DrillMap builds your first week.</p>

        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-sm border border-vellum-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-vellum-line"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-smoke">
          <div className="h-px flex-1 bg-vellum-line" />
          or
          <div className="h-px flex-1 bg-vellum-line" />
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-smoke">Name</span>
            <input
              type="text"
              name="name"
              required
              className="rounded-sm border border-vellum-line px-3 py-2 text-sm text-ink"
            />
            {state.errors?.name && <p className="text-sm text-danger-ink">{state.errors.name[0]}</p>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-smoke">Email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-sm border border-vellum-line px-3 py-2 text-sm text-ink"
            />
            {state.errors?.email && <p className="text-sm text-danger-ink">{state.errors.email[0]}</p>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-smoke">Password</span>
            <input
              type="password"
              name="password"
              required
              className="rounded-sm border border-vellum-line px-3 py-2 text-sm text-ink"
            />
            {state.errors?.password && (
              <ul className="text-sm text-danger-ink">
                {state.errors.password.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </label>

          <label className="flex items-start gap-2 text-sm text-smoke">
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

          {state.message && <p className="text-sm text-danger-ink">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-chalk transition-colors duration-150 ease-out hover:bg-graphite-raised disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-smoke">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-ink">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
