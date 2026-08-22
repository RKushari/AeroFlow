import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNav } from "@/components/navbar";
import { getSession } from "@/lib/auth";
import { SSEBanners } from "@/components/alerts/sse-banners";
import { PageTransition } from '@/components/animations/page-transition';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AeroFlow | Aviation Safety & Risk Intelligence",
  description: "Production-grade aviation safety and risk intelligence platform.",
};

export const dynamic = "force-dynamic";

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
      <body className={`${inter.className} min-h-screen antialiased bg-slate-950 text-slate-100`}>
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

          {/* Real-Time Priority Broadcast & Safety Alerts for all screens */}
          <SSEBanners />

          <div className="flex flex-col min-h-screen relative z-10">
            <TopNav session={session} />
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
