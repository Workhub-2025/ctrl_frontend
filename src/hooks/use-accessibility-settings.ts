"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const ACCESSIBILITY_STORAGE_KEY = "ctrl-accessibility-settings";

export type AccessibilityTheme = "slate" | "obsidian" | "daylight" | "parchment";
export type AccessibilityTextSize = "100" | "112" | "125";

export type AccessibilitySettings = {
  theme: AccessibilityTheme;
  textSize: AccessibilityTextSize;
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
  theme: "slate",
  textSize: "100",
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

export const accessibilityThemeClassName: Record<AccessibilityTheme, string> = {
  slate: "bg-background",
  obsidian: "bg-background",
  daylight: "bg-background",
  parchment: "bg-background",
};

export const LIGHT_THEMES: ReadonlySet<AccessibilityTheme> = new Set([
  "daylight",
  "parchment",
]);

export function isLightAccessibilityTheme(theme: AccessibilityTheme): boolean {
  return LIGHT_THEMES.has(theme);
}

const themes = ["slate", "obsidian", "daylight", "parchment"] as const;
const textSizes = ["100", "112", "125"] as const;
const lineSpacings = ["default", "comfortable", "spacious"] as const;
const contrasts = ["default", "high"] as const;
const motions = ["full", "reduced"] as const;
const fontFamilies = ["default", "reading", "dyslexia"] as const;
const saturations = ["default", "reduced"] as const;

/** One-time migration from the pre-2026-07 theme / text-size keys. */
const THEME_MIGRATION: Record<string, AccessibilityTheme> = {
  "dark-blue": "slate",
  black: "obsidian",
  "light-blue": "daylight",
  "soft-cream": "parchment",
  slate: "slate",
  obsidian: "obsidian",
  daylight: "daylight",
  parchment: "parchment",
};

const TEXT_SIZE_MIGRATION: Record<string, AccessibilityTextSize> = {
  default: "100",
  large: "112",
  "extra-large": "125",
  "100": "100",
  "112": "112",
  "125": "125",
};

function isOneOf<TValue extends string>(value: unknown, options: readonly TValue[]): value is TValue {
  return typeof value === "string" && options.includes(value as TValue);
}

function storedBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function migrateTheme(value: unknown): AccessibilityTheme {
  if (typeof value !== "string") return defaultAccessibilitySettings.theme;
  return THEME_MIGRATION[value] ?? defaultAccessibilitySettings.theme;
}

function migrateTextSize(value: unknown): AccessibilityTextSize {
  if (typeof value !== "string") return defaultAccessibilitySettings.textSize;
  return TEXT_SIZE_MIGRATION[value] ?? defaultAccessibilitySettings.textSize;
}

export function sanitiseAccessibilitySettings(input: unknown): AccessibilitySettings {
  const candidate =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  // Graceful migration from older boolean flags to fontFamily enum
  let migratedFontFamily: AccessibilitySettings["fontFamily"];
  if (isOneOf(candidate.fontFamily, fontFamilies)) {
    migratedFontFamily = candidate.fontFamily;
  } else if (candidate.dyslexiaFont === true) {
    migratedFontFamily = "dyslexia";
  } else if (candidate.readingFont === true) {
    migratedFontFamily = "reading";
  } else {
    migratedFontFamily = "default";
  }

  return {
    theme: migrateTheme(candidate.theme),
    textSize: migrateTextSize(candidate.textSize),
    lineSpacing: isOneOf(candidate.lineSpacing, lineSpacings)
      ? candidate.lineSpacing
      : defaultAccessibilitySettings.lineSpacing,
    contrast: isOneOf(candidate.contrast, contrasts)
      ? candidate.contrast
      : defaultAccessibilitySettings.contrast,
    motion: isOneOf(candidate.motion, motions) ? candidate.motion : defaultAccessibilitySettings.motion,
    enhancedFocus: storedBoolean(candidate.enhancedFocus, defaultAccessibilitySettings.enhancedFocus),
    fontFamily: migratedFontFamily,
    hoverReader: storedBoolean(candidate.hoverReader, defaultAccessibilitySettings.hoverReader),
    grayscale: storedBoolean(candidate.grayscale, defaultAccessibilitySettings.grayscale),
    underlineLinks: storedBoolean(candidate.underlineLinks, defaultAccessibilitySettings.underlineLinks),
    saturation: isOneOf(candidate.saturation, saturations)
      ? candidate.saturation
      : defaultAccessibilitySettings.saturation,
  };
}

function readStoredSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return defaultAccessibilitySettings;

  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return defaultAccessibilitySettings;
    return sanitiseAccessibilitySettings(JSON.parse(raw));
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
    if (isLightAccessibilityTheme(settings.theme)) {
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
      let speechTimeout: ReturnType<typeof setTimeout> | undefined;

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;

        const tagsToRead = ["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BUTTON", "A", "LABEL"];
        if (!tagsToRead.includes(target.tagName)) return;

        const text = target.innerText?.trim();
        if (!text || text === lastSpokenText) return;

        if (speechTimeout) clearTimeout(speechTimeout);
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
        if (speechTimeout) clearTimeout(speechTimeout);
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
        if (speechTimeout) clearTimeout(speechTimeout);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [enabled, settings.hoverReader]);

  return {
    settings,
    updateSettings: (patch: Partial<AccessibilitySettings>) =>
      setSettings((current) => sanitiseAccessibilitySettings({ ...current, ...patch })),
    resetSettings: () => {
      setStorageReady(true);
      setSettings(defaultAccessibilitySettings);
    },
    reduceMotion,
    themeClassName: accessibilityThemeClassName[settings.theme],
  };
}
