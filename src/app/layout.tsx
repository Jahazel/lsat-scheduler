import { auth } from "@/auth";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminTestProvider } from "@/components/AdminTestContext";
import { FailureToastProvider } from "@/components/FailureNotice";
import SiteHeader from "@/components/nav/SiteHeader";
import SiteMotion from "@/components/SiteMotion";
import { Footer } from "@/components/ui/Footer";
import { WORKSPACE_NAV_BREAKPOINT } from "@/components/nav/workspaceBreakpoint";
import { ARRIVAL_COOKIE } from "@/lib/googleArrival";
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
  const arriving = !!session?.user && (await cookies()).has(ARRIVAL_COOKIE);
  return (
    <html
      lang="en"
      data-arrival={arriving ? "google" : undefined}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* has-[] adds room for the floating mobile tab bar, only when it is on the page (students). */}
      <body className={`min-h-full flex flex-col has-[[data-tab-bar]]:pb-24 md:has-[[data-tab-bar]]:pb-0 ${WORKSPACE_NAV_BREAKPOINT.bodyTabBarPadding}`}>
        <AdminTestProvider key={`${session?.user?.id ?? "anonymous"}:${session?.user?.role ?? "student"}`}>
          <FailureToastProvider>
            <SiteHeader />
            <main tabIndex={-1} className="flex-1 outline-none">{children}</main>
            <Footer signedIn={!!session?.user} />
            <SiteMotion signedIn={!!session?.user} />
          </FailureToastProvider>
        </AdminTestProvider>
      </body>
    </html>
  );
}
