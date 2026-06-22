import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono, Atkinson_Hyperlegible } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { StoreHydration } from "@/components/providers/store-hydration";
import { CookieBannerMount } from "@/components/legal/cookie-banner-mount";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-atkinson",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "CTRL Assessment", template: "%s | CTRL Assessment" },
  description: "Assessment platform for emergency services personnel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        plusJakartaSans.variable,
        outfit.variable,
        jetBrainsMono.variable,
        atkinsonHyperlegible.variable
      )}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased transition-colors duration-300"
        )}
      >
        <ThemeProvider>
          <StoreHydration>{children}</StoreHydration>
          <CookieBannerMount />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}