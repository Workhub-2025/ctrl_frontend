"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const ACCESSIBILITY_STORAGE_KEY = "ctrl-accessibility-settings";

export type AccessibilitySettings = {
  theme: "dark-blue" | "black" | "soft-cream" | "light-blue";
  textSize: "default" | "large" | "extra-large";
  lineSpacing: "default" | "comfortable" | "spacious";
  contrast: "default" | "high";
  motion: "full" | "reduced";
  enhancedFocus: boolean;
  fontFamily: "default" | "reading" | "dyslexia";
  hoverReader: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  saturation: "default" | "reduced";
};

export const defaultAccessibilitySettings: AccessibilitySettings = {
  theme: "dark-blue",
  textSize: "default",
  lineSpacing: "default",
  contrast: "default",
  motion: "full",
  enhancedFocus: false,
  fontFamily: "default",
  hoverReader: false,
  grayscale: false,
  underlineLinks: false,
  saturation: "default",
};

export const accessibilityThemeClassName: Record<AccessibilitySettings["theme"], string> = {
  "dark-blue": "bg-[#080c16]",
  black: "bg-black",
  "soft-cream": "bg-[#fdf7ec]",
  "light-blue": "bg-[#eef5fc]",
};

function sanitiseSettings(input: Partial<AccessibilitySettings>): AccessibilitySettings {
  // Graceful migration from older boolean flags to fontFamily enum
  let migratedFontFamily = input.fontFamily;
  if (!migratedFontFamily) {
    const oldInput = input as any;
    if (oldInput.dyslexiaFont) {
      migratedFontFamily = "dyslexia";
    } else if (oldInput.readingFont) {
      migratedFontFamily = "reading";
    } else {
      migratedFontFamily = "default";
    }
  }

  const next = {
    ...defaultAccessibilitySettings,
    ...input,
    fontFamily: migratedFontFamily,
  } as AccessibilitySettings;

  if (!(next.theme in accessibilityThemeClassName)) {
    next.theme = defaultAccessibilitySettings.theme;
  }

  return next;
}

function readStoredSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return defaultAccessibilitySettings;

  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return defaultAccessibilitySettings;
    return sanitiseSettings(JSON.parse(raw) as Partial<AccessibilitySettings>);
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function useAccessibilitySettings(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultAccessibilitySettings);
  const [storageReady, setStorageReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = settings.motion === "reduced" || !!prefersReducedMotion;
  const prevThemeRef = useRef<AccessibilitySettings["theme"] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStorageReady(false);
      return;
    }

    setSettings(readStoredSettings());
    setStorageReady(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !storageReady) return;

    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));

    const root = document.documentElement;

    // Suppress transitions during an actual theme change so the recolour is a
    // single instant repaint instead of animating colour + blur across the DOM.
    const themeChanged =
      prevThemeRef.current !== null && prevThemeRef.current !== settings.theme;
    if (themeChanged) {
      root.setAttribute("data-ctrl-theme-switching", "");
    }

    root.dataset.ctrlTheme = settings.theme;
    root.dataset.ctrlTextSize = settings.textSize;
    root.dataset.ctrlLineSpacing = settings.lineSpacing;
    root.dataset.ctrlContrast = settings.contrast;
    root.dataset.ctrlMotion = reduceMotion ? "reduced" : "full";
    root.dataset.ctrlFocus = settings.enhancedFocus ? "enhanced" : "default";
    root.dataset.ctrlFontFamily = settings.fontFamily;
    root.dataset.ctrlGrayscale = settings.grayscale ? "enabled" : "default";
    root.dataset.ctrlUnderlineLinks = settings.underlineLinks ? "enabled" : "default";
    root.dataset.ctrlSaturation = settings.saturation;

    // Synchronise root dark/light class
    const isLight = settings.theme === "soft-cream" || settings.theme === "light-blue";
    if (isLight) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }

    prevThemeRef.current = settings.theme;

    // Restore transitions after the browser has painted the new theme.
    if (themeChanged) {
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          root.removeAttribute("data-ctrl-theme-switching");
        });
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [enabled, storageReady, settings, reduceMotion]);

  // Handle Speech Hover Reader
  useEffect(() => {
    if (!enabled) return;

    if (settings.hoverReader) {
      let lastSpokenText = "";
      let speechTimeout: any;

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;

        const tagsToRead = ["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BUTTON", "A", "LABEL"];
        if (!tagsToRead.includes(target.tagName)) return;

        const text = target.innerText?.trim();
        if (!text || text === lastSpokenText) return;

        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;
            utterance.onend = () => {
              lastSpokenText = "";
            };
            window.speechSynthesis.speak(utterance);
            lastSpokenText = text;
          }
        }, 450); // Debounce speech
      };

      const handleMouseLeave = () => {
        clearTimeout(speechTimeout);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        lastSpokenText = "";
      };

      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("mouseleave", handleMouseLeave);
        clearTimeout(speechTimeout);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [enabled, settings.hoverReader]);

  return {
    settings,
    updateSettings: (patch: Partial<AccessibilitySettings>) =>
      setSettings((current) => sanitiseSettings({ ...current, ...patch })),
    resetSettings: () => {
      setStorageReady(true);
      setSettings(defaultAccessibilitySettings);
    },
    reduceMotion,
    themeClassName: accessibilityThemeClassName[settings.theme],
  };
}
