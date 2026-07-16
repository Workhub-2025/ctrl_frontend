"use client";

import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";

type ThemeMode = "light" | "dark";

export function ThemeProvider({
  children,
  nonce,
}: {
  readonly children: React.ReactNode;
  readonly nonce?: string;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="theme"
      themes={["light", "dark"]}
      nonce={nonce}
    >
      {children}
    </NextThemeProvider>
  );
}

export function useTheme() {
  const { theme, setTheme } = useNextTheme();

  return {
    theme: (theme as ThemeMode) || "dark",
    setTheme: (nextTheme: ThemeMode) => setTheme(nextTheme),
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
