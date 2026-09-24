import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/nav/SiteHeader";
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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
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
        {/* room for the floating mobile tab bar */}
        <div className="h-24 md:hidden" aria-hidden />
      </body>
    </html>
  );
}
