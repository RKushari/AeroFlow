import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <div className="flex flex-col min-h-screen">
          <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
            <h1 className="text-xl font-bold tracking-tight">AeroFlow</h1>
          </header>
          <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
