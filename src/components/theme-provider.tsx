"use client";

import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";

type ThemeMode = "light" | "dark";

export function ThemeProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="theme"
    >
      {children}
    </NextThemeProvider>
  );
}

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme();
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";

  return {
    theme,
    setTheme: (nextTheme: ThemeMode) => setTheme(nextTheme),
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
