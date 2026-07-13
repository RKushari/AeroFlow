import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import ProfileDropdown from "@/components/profile-dropdown";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AeroFlow | Aviation Safety & Risk Intelligence",
  description: "Production-grade aviation safety and risk intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              <Link href="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                AeroFlow
              </Link>
              <div className="flex items-center gap-4">
                <ProfileDropdown />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
