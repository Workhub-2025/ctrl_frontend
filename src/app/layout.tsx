import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono, Atkinson_Hyperlegible } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { StoreHydration } from "@/components/providers/store-hydration";
import { PortalQueryProvider } from "@/components/providers/portal-query-provider";
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

/** Inline bootstrap: apply persisted CTRL theme before first paint to avoid flash. */
const THEME_BOOTSTRAP = `(function(){try{var k="ctrl-accessibility-settings";var raw=localStorage.getItem(k);var s=raw?JSON.parse(raw):{};var themeMap={"dark-blue":"slate",black:"obsidian","light-blue":"daylight","soft-cream":"parchment",slate:"slate",obsidian:"obsidian",daylight:"daylight",parchment:"parchment"};var sizeMap={default:"100",large:"112","extra-large":"125","100":"100","112":"112","125":"125"};var theme=themeMap[s.theme]||"slate";var textSize=sizeMap[s.textSize]||"100";var light=theme==="daylight"||theme==="parchment";var r=document.documentElement;r.dataset.ctrlTheme=theme;r.dataset.ctrlTextSize=textSize;if(s.lineSpacing)r.dataset.ctrlLineSpacing=s.lineSpacing;if(s.contrast)r.dataset.ctrlContrast=s.contrast;if(s.motion)r.dataset.ctrlMotion=s.motion;if(s.fontFamily)r.dataset.ctrlFontFamily=s.fontFamily;if(s.enhancedFocus)r.dataset.ctrlFocus="enhanced";if(s.grayscale)r.dataset.ctrlGrayscale="enabled";if(s.underlineLinks)r.dataset.ctrlUnderlineLinks="enabled";if(s.saturation)r.dataset.ctrlSaturation=s.saturation;r.classList.remove(light?"dark":"light");r.classList.add(light?"light":"dark");}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en-GB"
      className={cn(
        "dark",
        plusJakartaSans.variable,
        outfit.variable,
        jetBrainsMono.variable,
        atkinsonHyperlegible.variable
      )}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased transition-colors duration-300"
        )}
      >
        <ThemeProvider nonce={nonce}>
          <PortalQueryProvider>
            <StoreHydration>{children}</StoreHydration>
          </PortalQueryProvider>
          <CookieBannerMount />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
