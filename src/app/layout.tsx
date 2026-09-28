import { auth } from "@/auth";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AdminTestProvider } from "@/components/AdminTestContext";
import SiteHeader from "@/components/nav/SiteHeader";
import { WORKSPACE_NAV_BREAKPOINT } from "@/components/nav/workspaceBreakpoint";
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
      {/* has-[] adds room for the floating mobile tab bar, only when it is on the page (students). */}
      <body className={`min-h-full flex flex-col has-[[data-tab-bar]]:pb-24 md:has-[[data-tab-bar]]:pb-0 ${WORKSPACE_NAV_BREAKPOINT.bodyTabBarPadding}`}>
        <AdminTestProvider key={`${session?.user?.id ?? "anonymous"}:${session?.user?.role ?? "student"}`}>
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
        </AdminTestProvider>
      </body>
    </html>
  );
}
