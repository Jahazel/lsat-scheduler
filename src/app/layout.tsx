import { auth } from "@/auth";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminTestProvider } from "@/components/AdminTestContext";
import SiteHeader from "@/components/nav/SiteHeader";
import { Footer } from "@/components/ui/Footer";
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
          <Footer />
        </AdminTestProvider>
      </body>
    </html>
  );
}
