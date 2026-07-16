import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono, Atkinson_Hyperlegible } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { StoreHydration } from "@/components/providers/store-hydration";
import { CookieBannerMount } from "@/components/legal/cookie-banner-mount";
import { headers } from "next/headers";

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
  description: "Structured assessment delivery and review for organisational hiring teams.",
};

// A nonce-based CSP requires request-time rendering so Next.js can apply the
// per-request nonce to framework and inline bootstrap scripts.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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
        <ThemeProvider nonce={nonce}>
          <StoreHydration>{children}</StoreHydration>
          <CookieBannerMount />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
