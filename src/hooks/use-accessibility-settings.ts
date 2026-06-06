"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export const ACCESSIBILITY_STORAGE_KEY = "ctrl-accessibility-settings";

export type AccessibilitySettings = {
  background: "dark-blue" | "black" | "soft-light" | "light-blue";
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
  background: "dark-blue",
  textSize: "default",
  lineSpacing: "default",
  contrast: "default",
  motion: "full",
  enhancedFocus: false,
  readingFont: false,
  underlineLinks: false,
  saturation: "default",
};

export const accessibilityBackgroundClassName: Record<AccessibilitySettings["background"], string> = {
  "dark-blue": "bg-[#000a1f]",
  black: "bg-black",
  "soft-light": "bg-[#f8fbff]",
  "light-blue": "bg-[#eaf6ff]",
};

function sanitiseSettings(input: Partial<AccessibilitySettings>): AccessibilitySettings {
  const next = { ...defaultAccessibilitySettings, ...input };

  if (!(next.background in accessibilityBackgroundClassName)) {
    next.background = defaultAccessibilitySettings.background;
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
    root.dataset.ctrlBackground = settings.background;
    root.dataset.ctrlTextSize = settings.textSize;
    root.dataset.ctrlLineSpacing = settings.lineSpacing;
    root.dataset.ctrlContrast = settings.contrast;
    root.dataset.ctrlMotion = reduceMotion ? "reduced" : "full";
    root.dataset.ctrlFocus = settings.enhancedFocus ? "enhanced" : "default";
    root.dataset.ctrlReadingFont = settings.readingFont ? "enabled" : "default";
    root.dataset.ctrlUnderlineLinks = settings.underlineLinks ? "enabled" : "default";
    root.dataset.ctrlSaturation = settings.saturation;
  }, [enabled, settings, reduceMotion]);

  return {
    settings,
    updateSettings: (patch: Partial<AccessibilitySettings>) =>
      setSettings((current) => sanitiseSettings({ ...current, ...patch })),
    resetSettings: () => setSettings(defaultAccessibilitySettings),
    reduceMotion,
    backgroundClassName: accessibilityBackgroundClassName[settings.background],
  };
}
