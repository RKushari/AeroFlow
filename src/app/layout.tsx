import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import ProfileDropdown from "@/components/profile-dropdown";
import Link from "next/link";
import { getSession } from "@/lib/auth";

import { PageTransition } from '@/components/animations/page-transition';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AeroFlow | Aviation Safety & Risk Intelligence",
  description: "Production-grade aviation safety and risk intelligence platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await getSession();
  } catch (err) {
    console.error("Failed to load session:", err);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/* Animated wave background */}
          <div className="box">
            <div className="wave -one"></div>
            <div className="wave -two"></div>
            <div className="wave -three"></div>
          </div>

          <div className="flex flex-col min-h-screen relative z-10">
            <header className="glass-header p-4 sticky top-0 z-50 flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  AeroFlow
                </Link>
                <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-300">
                  <Link href="/dispatcher/dashboard" className="hover:text-blue-400 transition-colors">
                    Dispatch Cockpit
                  </Link>
                  <Link href="/crew/dashboard" className="hover:text-amber-400 transition-colors">
                    Ground Crew
                  </Link>
                  <Link href="/incidents" className="flex items-center gap-1 text-red-400 hover:text-red-300 bg-red-950/40 px-2.5 py-1 rounded-full border border-red-800/50 transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                    Hazard Reporter
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <ProfileDropdown session={session} />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
