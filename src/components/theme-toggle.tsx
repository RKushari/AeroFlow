"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className={`h-5 w-5 text-yellow-300 transition-all duration-300 ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute"}`} />
      <Moon className={`h-5 w-5 text-slate-200 transition-all duration-300 ${theme === "dark" ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100"}`} />
    </button>
  );
}
