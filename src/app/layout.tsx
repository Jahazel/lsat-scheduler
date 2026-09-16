import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DrillMap",
  description: "Weekly LSAT drilling plans, built from your own analytics.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-ink-100 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col px-5 sm:flex-row sm:items-stretch sm:px-8">
            <div className="flex min-h-14 flex-1 items-center gap-8 sm:min-h-20">
              <Link href="/" className="font-semibold tracking-tight text-ink-900">
                DrillMap
              </Link>
              {session?.user && (
                <div className="hidden border-l border-ink-100 pl-6 sm:block">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                    {session.user.role === "admin" ? "Admin workspace" : "Your study week"}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ink-900">
                    {session.user.role === "admin" ? "Students and analytics" : "Schedule and progress"}
                  </p>
                </div>
              )}
            </div>
            <nav className="flex items-stretch justify-end border-t border-ink-100 sm:border-t-0" aria-label="Primary navigation">
              {session?.user ? (
                <>
                  {session.user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="flex items-center border-x border-ink-100 px-2 text-sm font-medium text-ink-600 hover:text-ink-900 sm:px-6"
                    >
                      Admin
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/dashboard"
                        className="flex items-center border-x border-ink-100 px-2 text-sm font-medium text-ink-600 hover:text-ink-900 sm:px-6"
                      >
                        Weekly schedule
                      </Link>
                      <Link href="/account" className="flex items-center px-2 text-sm text-ink-600 hover:text-ink-900 sm:px-6">
                        Account
                      </Link>
                    </>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                    className="flex items-center pl-2"
                  >
                    <button
                      type="submit"
                      className="rounded-md px-2 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900 sm:px-3"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex items-center px-3 text-sm text-ink-600 hover:text-ink-900">
                    Log in
                  </Link>
                  <Link href="/signup" className="flex items-center px-3 text-sm font-medium text-ink-600 hover:text-ink-900">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-ink-100 px-6 py-6 text-center text-xs text-ink-400">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="hover:text-ink-600">
              Terms of Service
            </Link>
            <Link href="/legal/privacy" className="hover:text-ink-600">
              Privacy Policy
            </Link>
            <Link href="/legal/ai-disclosure" className="hover:text-ink-600">
              AI Disclosure
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
