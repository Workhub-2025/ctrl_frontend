"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const ACCESSIBILITY_STORAGE_KEY = "ctrl-accessibility-settings";

export type AccessibilitySettings = {
  theme: "dark-blue" | "black" | "soft-cream" | "light-blue";
  textSize: "default" | "large" | "extra-large";
  lineSpacing: "default" | "comfortable" | "spacious";
  contrast: "default" | "high";
  motion: "full" | "reduced";
  enhancedFocus: boolean;
  readingFont: boolean;
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
  readingFont: false,
  underlineLinks: false,
  saturation: "default",
};

export const accessibilityThemeClassName: Record<AccessibilitySettings["theme"], string> = {
  "dark-blue": "bg-[#02040a]",
  black: "bg-black",
  "soft-cream": "bg-[#fdfaf2]",
  "light-blue": "bg-[#eaf6ff]",
};

function sanitiseSettings(input: Partial<AccessibilitySettings>): AccessibilitySettings {
  const next = { ...defaultAccessibilitySettings, ...input };

  if (!(next.theme in accessibilityThemeClassName)) {
    next.theme = defaultAccessibilitySettings.theme;
  }

  return next;
}

export function useAccessibilitySettings(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultAccessibilitySettings);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = settings.motion === "reduced" || !!prefersReducedMotion;

  useEffect(() => {
    if (!enabled) return;

    try {
      const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      if (!raw) return;
      setSettings(sanitiseSettings(JSON.parse(raw) as Partial<AccessibilitySettings>));
    } catch {
      setSettings(defaultAccessibilitySettings);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));

    const root = document.documentElement;
    root.dataset.ctrlTheme = settings.theme;
    root.dataset.ctrlTextSize = settings.textSize;
    root.dataset.ctrlLineSpacing = settings.lineSpacing;
    root.dataset.ctrlContrast = settings.contrast;
    root.dataset.ctrlMotion = reduceMotion ? "reduced" : "full";
    root.dataset.ctrlFocus = settings.enhancedFocus ? "enhanced" : "default";
    root.dataset.ctrlReadingFont = settings.readingFont ? "enabled" : "default";
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
  }, [enabled, settings, reduceMotion]);

  return {
    settings,
    updateSettings: (patch: Partial<AccessibilitySettings>) =>
      setSettings((current) => sanitiseSettings({ ...current, ...patch })),
    resetSettings: () => setSettings(defaultAccessibilitySettings),
    reduceMotion,
    themeClassName: accessibilityThemeClassName[settings.theme],
  };
}
