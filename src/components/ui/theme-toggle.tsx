"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-full backdrop-blur-sm border transition-all duration-200 hover:scale-110 theme-toggle bg-background/80 border-border hover:bg-background w-9 h-9 flex items-center justify-center relative ${
        theme === "dark" ? "dark" : ""
      }`}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 sun-icon" />
      <Moon className="h-4 w-4 moon-icon" />
    </button>
  );
}
