"use client";

import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";

type ThemeMode = "dark";

export function ThemeProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      forcedTheme="dark"
      storageKey="theme"
      themes={["dark"]}
    >
      {children}
    </NextThemeProvider>
  );
}

export function useTheme() {
  const { setTheme } = useNextTheme();
  const theme: ThemeMode = "dark";

  return {
    theme,
    setTheme: (nextTheme: ThemeMode) => setTheme(nextTheme),
    toggle: () => setTheme("dark"),
  };
}
