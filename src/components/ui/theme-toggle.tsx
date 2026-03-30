"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`theme-toggle relative flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-background ${
        theme === "dark" ? "dark" : ""
      }`}
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
      type="button"
    >
      <Sun className="h-4 w-4 sun-icon" />
      <Moon className="h-4 w-4 moon-icon" />
    </button>
  );
}
