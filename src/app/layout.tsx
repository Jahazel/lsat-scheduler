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
        <header className="border-b border-ink-100 px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-ink-900">
              DrillMap
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session?.user ? (
                <>
                  {session.user.role === "admin" ? (
                    <Link href="/admin" className="text-ink-600 hover:text-ink-900">
                      Admin
                    </Link>
                  ) : (
                    <>
                      <Link href="/dashboard" className="text-ink-600 hover:text-ink-900">
                        Dashboard
                      </Link>
                      <Link href="/account" className="text-ink-600 hover:text-ink-900">
                        Account
                      </Link>
                    </>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button type="submit" className="text-ink-600 hover:text-ink-900">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-ink-600 hover:text-ink-900">
                    Log in
                  </Link>
                  <Link href="/signup" className="font-medium text-accent-600 hover:text-accent-700">
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
